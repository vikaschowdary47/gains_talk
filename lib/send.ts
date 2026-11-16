import "server-only";
import type { Channel, Contact } from "./types";
import { manualSendUrl } from "./channels";
import { graphBase, graphVersion } from "./meta";
import { twilioReady, twilioSend } from "./twilio";

export interface SendResult {
  via: "api" | "manual";
  /** Opens the client's chat so the coach can paste and send. */
  openUrl?: string;
  error?: string;
  /** The platform's id for the sent message, to match later delivery updates. */
  externalId?: string;
}

export function whatsappApiReady(): boolean {
  return twilioReady() || Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}
export function instagramApiReady(): boolean {
  return Boolean(process.env.INSTAGRAM_TOKEN);
}
export function messengerApiReady(): boolean {
  return Boolean(process.env.MESSENGER_PAGE_TOKEN);
}

const isNumericId = (v: string) => /^\d{6,}$/.test(v);

/** Turn Meta's error into a sentence a coach can act on. */
export function explainMetaError(app: string, raw: string | { code?: number; message?: string; error_data?: { details?: string } }): string {
  let code: number | undefined;
  let message = "";
  if (typeof raw === "object") raw = JSON.stringify({ error: raw });
  try {
    const e = (JSON.parse(raw) as { error?: { code?: number; message?: string; error_data?: { details?: string } } }).error;
    code = e?.code;
    message = e?.error_data?.details || e?.message || "";
  } catch {
    message = raw.slice(0, 160);
  }
  if (code === 131031) return `Meta has locked your ${app} Business account, so it isn't delivering messages. Check WhatsApp Manager (Business Support Home) for the reason, or contact Meta support.`;
  if (code === 131030) return `${app} only lets a test number send to numbers on its list. Add this number under "To" on Meta's API Setup page, then send again.`;
  if (code === 190) return `Your ${app} access token has expired. Make a new one, put it in Vercel and redeploy.`;
  if (code === 131047) return `It's been more than 24 hours since this client last messaged, so ${app} won't deliver a free-form reply.`;
  if (code === 131026) return `${app} couldn't deliver to this number. Check that it's on ${app}.`;
  if (code === 10 || code === 200) return `The app doesn't have permission to send on ${app}.`;
  return `${app} didn't accept the message${message ? `: ${message}` : "."}`;
}

let lastId: string | undefined;
async function post(url: string, headers: Record<string, string>, body: unknown): Promise<string | null> {
  lastId = undefined;
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
    const text = await res.text();
    if (!res.ok) return text;
    try {
      const json = JSON.parse(text) as { messages?: { id?: string }[]; message_id?: string };
      lastId = json.messages?.[0]?.id ?? json.message_id;
    } catch {
      /* fine: some APIs return no body */
    }
    return null;
  } catch (e) {
    return String(e);
  }
}

/**
 * Send a reply the coach approved. WhatsApp, Instagram and Messenger go out
 * through Meta's APIs when they're configured. Everything else returns a link:
 * the app copies the reply and opens the chat, and the coach taps send.
 */
export async function sendReply(contact: Contact, channel: Channel, text: string): Promise<SendResult> {
  const handles = contact.handles.filter((h) => h.channel === channel).map((h) => h.value);
  // Numeric platform ids are for the API; usernames make better "open chat" links.
  const apiId = handles.find(isNumericId);
  const linkHandle = (channel === "instagram" || channel === "messenger" ? handles.find((h) => !isNumericId(h)) : handles[0]) ?? handles[0];
  const manual = (error?: string): SendResult => ({ via: "manual", openUrl: manualSendUrl(channel, linkHandle, text), ...(error ? { error } : {}) });

  // Twilio (Sandbox or sender) takes WhatsApp when it's configured.
  if (channel === "whatsapp" && twilioReady() && handles[0]) {
    const res = await twilioSend(handles[0], text);
    if ("sid" in res) return { via: "api", externalId: res.sid };
    console.error("[send] Twilio error:", res.error);
    return manual(`${res.error} The reply is copied so you can send it yourself.`);
  }

  if (channel === "whatsapp" && whatsappApiReady() && handles[0]) {
    const err = await post(
      `${graphBase()}/${graphVersion()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
      { messaging_product: "whatsapp", recipient_type: "individual", to: handles[0].replace(/\D/g, ""), type: "text", text: { body: text, preview_url: false } }
    );
    if (!err) return { via: "api", ...(lastId ? { externalId: lastId } : {}) };
    console.error("[send] WhatsApp API error:", err);
    return manual(`${explainMetaError("WhatsApp", err)} The reply is copied so you can send it yourself.`);
  }

  if (channel === "instagram" && instagramApiReady() && apiId) {
    const err = await post(
      `https://graph.instagram.com/${graphVersion()}/me/messages`,
      { Authorization: `Bearer ${process.env.INSTAGRAM_TOKEN}` },
      { recipient: { id: apiId }, message: { text } }
    );
    if (!err) return { via: "api" };
    console.error("[send] Instagram API error:", err);
    return manual(`${explainMetaError("Instagram", err)} The reply is copied so you can send it yourself.`);
  }

  if (channel === "messenger" && messengerApiReady() && apiId) {
    const err = await post(
      `${graphBase()}/${graphVersion()}/me/messages?access_token=${encodeURIComponent(process.env.MESSENGER_PAGE_TOKEN!)}`,
      {},
      { recipient: { id: apiId }, messaging_type: "RESPONSE", message: { text } }
    );
    if (!err) return { via: "api" };
    console.error("[send] Messenger API error:", err);
    return manual(`${explainMetaError("Messenger", err)} The reply is copied so you can send it yourself.`);
  }

  return manual();
}
