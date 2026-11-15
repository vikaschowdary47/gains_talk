import { readDB, writeDB } from "@/lib/store";
import { admit, findByHandle } from "@/lib/privacy";
import { verifyChallenge, verifyMetaSignature } from "@/lib/meta";
import { uid } from "@/lib/util";

export const dynamic = "force-dynamic";

/** Meta calls this once to confirm the webhook URL. */
export async function GET(req: Request) {
  return verifyChallenge(req, process.env.WHATSAPP_VERIFY_TOKEN);
}

interface WaValue {
  contacts?: { wa_id: string; profile?: { name?: string } }[];
  messages?: { from: string; id: string; timestamp: string; type: string; text?: { body: string }; image?: { caption?: string } }[];
  /** Coexistence: messages the coach sent from the WhatsApp Business app on their phone. */
  message_echoes?: { to: string; id: string; timestamp: string; type: string; text?: { body: string } }[];
}

/**
 * Incoming WhatsApp messages (Cloud API + Coexistence echoes).
 * Every message passes the privacy gate first. Non-clients are dropped.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("Bad signature", { status: 401 });
  }
  const payload = JSON.parse(raw || "{}") as { entry?: { changes?: { field?: string; value?: WaValue }[] }[] };
  const db = await readDB();
  let stored = 0;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value ?? {};
      const names = new Map((v.contacts ?? []).map((c) => [c.wa_id, c.profile?.name]));

      for (const msg of v.messages ?? []) {
        const gate = admit(db, "whatsapp", msg.from, names.get(msg.from));
        if (!gate.admitted) continue; // dropped: never stored
        const text = msg.text?.body ?? msg.image?.caption ?? `[${msg.type} message]`;
        db.messages.filter((m) => m.clientId === gate.client.id && m.status === "needs_reply").forEach((m) => (m.status = "info"));
        db.messages.push({
          id: uid("wa_"),
          clientId: gate.client.id,
          channel: "whatsapp",
          direction: "in",
          text,
          at: new Date(Number(msg.timestamp) * 1000).toISOString(),
          status: "needs_reply",
        });
        stored++;
      }

      for (const echo of v.message_echoes ?? []) {
        const contact = findByHandle(db, "whatsapp", echo.to);
        if (!contact?.isClient) continue;
        db.messages.filter((m) => m.clientId === contact.id && m.status === "needs_reply").forEach((m) => (m.status = "replied"));
        db.messages.push({
          id: uid("wa_"),
          clientId: contact.id,
          channel: "whatsapp",
          direction: "out",
          text: echo.text?.body ?? `[${echo.type}]`,
          at: new Date(Number(echo.timestamp) * 1000).toISOString(),
          status: "info",
        });
        stored++;
      }
    }
  }

  await writeDB(db);
  return Response.json({ ok: true, stored });
}
