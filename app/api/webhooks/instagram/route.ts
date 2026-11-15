import { readDB, writeDB } from "@/lib/store";
import { admit } from "@/lib/privacy";
import { verifyChallenge, verifyMetaSignature } from "@/lib/meta";
import { uid } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return verifyChallenge(req, process.env.INSTAGRAM_VERIFY_TOKEN);
}

interface IgEvent {
  sender?: { id: string; username?: string };
  timestamp?: number;
  message?: { text?: string; is_echo?: boolean };
}

/**
 * Instagram DMs to the coach's professional account.
 * Match clients by their Instagram user id or username (stored as a handle).
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("Bad signature", { status: 401 });
  }
  const payload = JSON.parse(raw || "{}") as { entry?: { messaging?: IgEvent[] }[] };
  const db = readDB();
  let stored = 0;

  for (const entry of payload.entry ?? []) {
    for (const ev of entry.messaging ?? []) {
      if (!ev.sender?.id || !ev.message || ev.message.is_echo) continue;
      const handle = ev.sender.username ?? ev.sender.id;
      const gate = admit(db, "instagram", handle);
      if (!gate.admitted) continue;
      db.messages.filter((m) => m.clientId === gate.client.id && m.status === "needs_reply").forEach((m) => (m.status = "info"));
      db.messages.push({
        id: uid("ig_"),
        clientId: gate.client.id,
        channel: "instagram",
        direction: "in",
        text: ev.message.text ?? "[attachment]",
        at: new Date(ev.timestamp ?? Date.now()).toISOString(),
        status: "needs_reply",
      });
      stored++;
    }
  }
  writeDB(db);
  return Response.json({ ok: true, stored });
}
