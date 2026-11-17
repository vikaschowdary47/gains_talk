import { after } from "next/server";
import { logPendingStats } from "@/lib/stats";
import { readDB, writeDB } from "@/lib/store";
import { addHandle, ingest } from "@/lib/ingest";
import { lookupProfile, verifyChallenge, verifyMetaSignature } from "@/lib/meta";
import { SIGNATURE_HELP, describe, logHook, loggedChallenge, recordHook } from "@/lib/hooklog";
import type { IngestResult } from "@/lib/ingest";
import { igApi, igToken } from "@/lib/instagram";
import { findByHandle } from "@/lib/privacy";
import { uid } from "@/lib/util";
import type { DB } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return loggedChallenge("instagram", verifyChallenge(req, process.env.INSTAGRAM_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN));
}

interface IgEvent {
  sender?: { id: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean; attachments?: { type?: string }[] };
}

/**
 * Instagram DMs to the coach's professional account.
 * Meta sends a numeric sender id. With INSTAGRAM_TOKEN set we look up the
 * username so messages match clients saved by their @handle; the numeric id
 * is kept too, because replies through the API need it.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"), process.env.INSTAGRAM_APP_SECRET)) {
    await recordHook("instagram", false, SIGNATURE_HELP);
    return new Response("Bad signature", { status: 401 });
  }
  let payload: { entry?: { id?: string; messaging?: IgEvent[]; changes?: { field?: string; value?: IgEvent }[] }[] };
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    await recordHook("instagram", false, "Received something that wasn't JSON. Ignored.");
    return Response.json({ ok: true, stored: 0 });
  }
  const entries = payload.entry ?? [];
  const ownIds = new Set(entries.map((e) => e.id).filter(Boolean));
  // Meta sends DMs as entry.messaging, but some setups (and the dashboard's Test button) use entry.changes.
  const all: IgEvent[] = entries.flatMap((e) => [
    ...(e.messaging ?? []),
    ...(e.changes ?? []).filter((c) => c.field === "messages" && c.value).map((c) => c.value as IgEvent),
  ]);
  const echoes = all.filter((ev) => ev.message && (ev.message.is_echo || (ev.sender?.id && ownIds.has(ev.sender.id))));
  const events = all.filter((ev) => ev.sender?.id && ev.message && !ev.message.is_echo && !ownIds.has(ev.sender.id));
  if (events.length === 0 && echoes.length === 0) {
    await recordHook("instagram", true, "Meta sent an update with no new message in it.");
    return Response.json({ ok: true, stored: 0 });
  }

  const db = await readDB();
  const savedEchoes = saveEchoes(db, echoes);
  if (events.length === 0) {
    logHook(db, "instagram", true, savedEchoes ? "Your reply from the Instagram app was saved to the client's timeline." : "Your own sent message came back from Meta. Nothing new to save.");
    await writeDB(db);
    return Response.json({ ok: true, stored: savedEchoes });
  }

  const token = igToken(db);
  const base = igApi(db).base;
  const profiles = new Map<string, { name?: string; username?: string }>();
  for (const ev of events) {
    if (!profiles.has(ev.sender!.id)) profiles.set(ev.sender!.id, await lookupProfile("instagram", ev.sender!.id, token, base));
  }

  let stored = 0;
  const results: IngestResult[] = [];
  for (const ev of events) {
    const id = ev.sender!.id;
    const prof = profiles.get(id) ?? {};
    const text = ev.message!.text ?? (ev.message!.attachments?.length ? `[${ev.message!.attachments[0].type ?? "attachment"}]` : "");
    // Try the username first (how clients are usually saved), then the numeric id.
    let res = prof.username ? ingest(db, { channel: "instagram", handle: prof.username, name: prof.name, text, at: ev.timestamp, externalId: ev.message!.mid }) : null;
    if (!res || (!res.stored && res.reason === "unknown_sender")) {
      if (res && prof.username) db.pending = db.pending.filter((p) => !(p.handle.channel === "instagram" && p.handle.value === prof.username));
      res = ingest(db, { channel: "instagram", handle: id, name: prof.name ?? prof.username, text, at: ev.timestamp, externalId: ev.message!.mid });
    }
    results.push(res);
    if (res.stored) {
      addHandle(res.client, "instagram", id);
      stored++;
    }
  }
  logHook(db, "instagram", true, describe(results));
  await writeDB(db);
  if (stored) after(() => logPendingStats());
  return Response.json({ ok: true, stored });
}

/**
 * Messages the coach typed in the Instagram app come back as "echoes".
 * Save the ones sent to clients so the timeline is complete, and mark the client as answered.
 * Replies sent from GainsTalk are already saved (same message id), so they're skipped.
 */
function saveEchoes(db: DB, echoes: IgEvent[]): number {
  const known = new Set(db.messages.map((m) => m.externalId).filter(Boolean));
  let saved = 0;
  for (const ev of echoes) {
    const mid = ev.message?.mid;
    const to = ev.recipient?.id;
    if (!mid || !to || known.has(mid)) continue;
    const client = findByHandle(db, "instagram", to);
    if (!client?.isClient) continue; // never store chats with non-clients
    const text = ev.message!.text ?? (ev.message!.attachments?.length ? `[${ev.message!.attachments[0].type ?? "attachment"}]` : "");
    if (!text) continue;
    const at = ev.timestamp ? new Date(ev.timestamp).toISOString() : new Date().toISOString();
    // A reply sent from GainsTalk comes back as an echo too; skip it if the same text went out in the last 10 minutes.
    const sentHere = db.messages.find(
      (m) => m.clientId === client.id && m.direction === "out" && m.text.trim() === text.trim() && Math.abs(Date.parse(m.at) - Date.parse(at)) < 10 * 60_000,
    );
    if (sentHere) {
      sentHere.externalId ??= mid;
      known.add(mid);
      continue;
    }
    db.messages.push({ id: uid("out_"), clientId: client.id, channel: "instagram", direction: "out", text, at, status: "replied", externalId: mid });
    for (const m of db.messages) {
      if (m.clientId === client.id && m.status === "needs_reply" && m.at <= at) {
        m.status = "replied";
        m.repliedWith = text;
      }
    }
    known.add(mid);
    saved++;
  }
  return saved;
}
