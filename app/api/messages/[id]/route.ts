import { readDB, updateDB } from "@/lib/store";
import { sendReply } from "@/lib/send";
import { isSampleContact } from "@/lib/seed";
import { detectPromise } from "@/lib/promises";
import { enforceStyle } from "@/lib/style";
import { uid } from "@/lib/util";

export const dynamic = "force-dynamic";

/** Send or skip a client message. Nothing is sent without this explicit call. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: "send" | "skip"; text?: string };
  const db = await readDB();
  const msg = db.messages.find((m) => m.id === id);
  if (!msg) return Response.json({ error: "Message not found" }, { status: 404 });
  const contact = db.contacts.find((c) => c.id === msg.clientId);
  if (!contact) return Response.json({ error: "Client not found" }, { status: 404 });

  if (body.action === "skip") {
    await updateDB((fresh) => {
      const m = fresh.messages.find((x) => x.id === id);
      if (m) m.status = "skipped";
    });
    return Response.json({ ok: true });
  }

  if (body.action !== "send" || !body.text?.trim()) {
    return Response.json({ error: "Send needs the reply text" }, { status: 400 });
  }

  const text = enforceStyle(body.text, db.settings.style, db.settings.coachName);
  // Test messages and sample clients have made-up numbers: mark as replied, send nothing.
  const result = msg.demo || isSampleContact(contact) ? { via: "demo" as const } : await sendReply(contact, msg.channel, text);

  const promise = await updateDB((fresh) => {
    const m = fresh.messages.find((x) => x.id === id);
    if (m) {
      m.status = "replied";
      m.repliedWith = text;
    }
    const out = {
      id: uid("m_"),
      clientId: msg.clientId,
      channel: msg.channel,
      direction: "out" as const,
      text,
      at: new Date().toISOString(),
      status: "info" as const,
    };
    fresh.messages.push(out);
    const p = detectPromise(fresh, out);
    if (p) fresh.promises.push(p);
    return p;
  });

  return Response.json({ ok: true, text, ...result, promise });
}
