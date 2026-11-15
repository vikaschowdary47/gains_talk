import fs from "node:fs";
import path from "node:path";
import { readDB, updateDB, UPLOAD_DIR } from "@/lib/store";
import { uid } from "@/lib/util";

export const dynamic = "force-dynamic";

/**
 * Save a voice note the coach recorded while looking at the draft.
 * The app then opens the phone's share sheet so the coach sends it in the
 * client's app (WhatsApp, Instagram, iMessage...). Their voice, our prep.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const messageId = String(form.get("messageId") ?? "");
  const audio = form.get("audio");
  if (!messageId || !(audio instanceof Blob)) {
    return Response.json({ error: "messageId and audio are required" }, { status: 400 });
  }
  const db = readDB();
  const msg = db.messages.find((m) => m.id === messageId);
  if (!msg) return Response.json({ error: "Message not found" }, { status: 404 });
  if (audio.size > 12 * 1024 * 1024) return Response.json({ error: "Voice note is too long" }, { status: 413 });

  const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
  const name = `${uid("vn_")}.${ext}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), Buffer.from(await audio.arrayBuffer()));
  const url = `/api/files/${name}`;

  updateDB((fresh) => {
    const m = fresh.messages.find((x) => x.id === messageId);
    if (m) {
      m.status = "replied";
      m.repliedWith = "[voice note]";
    }
    fresh.messages.push({
      id: uid("m_"),
      clientId: msg.clientId,
      channel: msg.channel,
      direction: "out",
      text: "Voice note",
      audioUrl: url,
      at: new Date().toISOString(),
      status: "info",
    });
  });
  return Response.json({ ok: true, url });
}
