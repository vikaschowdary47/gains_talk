import { readDB, updateDB } from "@/lib/store";
import { extractFromScreenshot } from "@/lib/ai";
import { isChannel } from "@/lib/channels";
import { uid } from "@/lib/util";
import type { Channel, Message } from "@/lib/types";

export const dynamic = "force-dynamic";

type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/**
 * Manual intake for apps with no API (texts, iMessage, TikTok, Trainerize...).
 * The coach pastes a message or shares a screenshot and picks the client.
 * Only clients can be chosen, so the privacy rule still holds.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    clientId?: string;
    channel?: string;
    text?: string;
    imageBase64?: string;
    mediaType?: string;
    preview?: boolean;
  };

  const channel: Channel = isChannel(body.channel) ? body.channel : "texts";
  const db = await readDB();

  let lines: { from: "client" | "coach"; text: string }[] = [];
  let personName: string | undefined;

  if (body.imageBase64) {
    const mediaType = (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(body.mediaType ?? "") ? body.mediaType : "image/png") as MediaType;
    try {
      const chat = await extractFromScreenshot(body.imageBase64.replace(/^data:[^,]+,/, ""), mediaType);
      lines = chat.messages.filter((m) => m.text?.trim());
      personName = chat.personName;
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 422 });
    }
  } else if (body.text?.trim()) {
    lines = [{ from: "client", text: body.text.trim() }];
  } else {
    return Response.json({ error: "Paste a message or add a screenshot." }, { status: 400 });
  }

  // Suggest the client from the name on the screenshot.
  let clientId = body.clientId;
  if (!clientId && personName) {
    const guess = db.contacts.find((c) => c.isClient && c.name.toLowerCase().includes(personName!.toLowerCase().split(" ")[0]));
    clientId = guess?.id;
  }

  if (body.preview) {
    return Response.json({ lines, personName, suggestedClientId: clientId ?? null });
  }

  const client = db.contacts.find((c) => c.id === clientId);
  if (!client || !client.isClient) {
    return Response.json({ error: "Pick which client this is from. Only chats with your clients are saved." }, { status: 422 });
  }

  const added = await updateDB((fresh) => {
    const now = Date.now();
    const msgs: Message[] = lines.map((l, i) => ({
      id: uid("m_"),
      clientId: client.id,
      channel,
      direction: l.from === "coach" ? "out" : "in",
      text: l.text.trim(),
      at: new Date(now - (lines.length - i) * 1000).toISOString(),
      status: "info",
    }));
    const lastIn = [...msgs].reverse().find((m) => m.direction === "in");
    const lastAny = msgs[msgs.length - 1];
    if (lastIn && lastAny === lastIn) {
      fresh.messages.filter((m) => m.clientId === client.id && m.status === "needs_reply").forEach((m) => (m.status = "info"));
      lastIn.status = "needs_reply";
    }
    fresh.messages.push(...msgs);
    return msgs;
  });

  return Response.json({ ok: true, added: added.length, needsReply: added.some((m) => m.status === "needs_reply") });
}
