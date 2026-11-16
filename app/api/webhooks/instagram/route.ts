import { readDB, writeDB } from "@/lib/store";
import { addHandle, ingest } from "@/lib/ingest";
import { lookupProfile, verifyChallenge, verifyMetaSignature } from "@/lib/meta";
import { SIGNATURE_HELP, describe, logHook, loggedChallenge, recordHook } from "@/lib/hooklog";
import type { IngestResult } from "@/lib/ingest";
import { igApi, igToken } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return loggedChallenge("instagram", verifyChallenge(req, process.env.INSTAGRAM_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN));
}

interface IgEvent {
  sender?: { id: string };
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
  const echoes = all.filter((ev) => ev.message?.is_echo || (ev.sender?.id && ownIds.has(ev.sender.id))).length;
  const events = all.filter((ev) => ev.sender?.id && ev.message && !ev.message.is_echo && !ownIds.has(ev.sender.id));
  if (events.length === 0) {
    await recordHook("instagram", true, echoes ? "Your own sent message came back from Meta. Ignored." : "Meta sent an update with no new message in it.");
    return Response.json({ ok: true, stored: 0 });
  }

  const db = await readDB();
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
  return Response.json({ ok: true, stored });
}
