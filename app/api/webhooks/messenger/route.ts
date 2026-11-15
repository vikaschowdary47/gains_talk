import { readDB, writeDB } from "@/lib/store";
import { addHandle, ingest } from "@/lib/ingest";
import { lookupProfile, verifyChallenge, verifyMetaSignature } from "@/lib/meta";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return verifyChallenge(req, process.env.MESSENGER_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN);
}

interface MsEvent {
  sender?: { id: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean; attachments?: { type?: string }[] };
}

/** Facebook Messenger: messages to the coach's Facebook Page. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("Bad signature", { status: 401 });
  }
  const payload = JSON.parse(raw || "{}") as { object?: string; entry?: { messaging?: MsEvent[] }[] };
  const events = (payload.entry ?? []).flatMap((e) => e.messaging ?? []).filter((ev) => ev.sender?.id && ev.message && !ev.message.is_echo);
  if (events.length === 0) return Response.json({ ok: true, stored: 0 });

  const names = new Map<string, string | undefined>();
  for (const ev of events) {
    if (!names.has(ev.sender!.id)) names.set(ev.sender!.id, (await lookupProfile("messenger", ev.sender!.id)).name);
  }

  const db = await readDB();
  let stored = 0;
  for (const ev of events) {
    const id = ev.sender!.id;
    const text = ev.message!.text ?? (ev.message!.attachments?.length ? `[${ev.message!.attachments[0].type ?? "attachment"}]` : "");
    const res = ingest(db, { channel: "messenger", handle: id, name: names.get(id), text, at: ev.timestamp, externalId: ev.message!.mid });
    if (res.stored) {
      addHandle(res.client, "messenger", id);
      stored++;
    }
  }
  await writeDB(db);
  return Response.json({ ok: true, stored });
}
