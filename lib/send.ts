import "server-only";
import type { Channel, Contact } from "./types";
import { manualSendUrl } from "./channels";
import { graphVersion } from "./meta";

export interface SendResult {
  via: "api" | "manual";
  /** Opens the client's chat so the coach can paste and send. */
  openUrl?: string;
  error?: string;
}

export function whatsappApiReady(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}
export function instagramApiReady(): boolean {
  return Boolean(process.env.INSTAGRAM_TOKEN);
}
export function messengerApiReady(): boolean {
  return Boolean(process.env.MESSENGER_PAGE_TOKEN);
}

const isNumericId = (v: string) => /^\d{6,}$/.test(v);

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
    if (res.ok) return null;
    return await res.text();
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

  if (channel === "whatsapp" && whatsappApiReady() && handles[0]) {
    const err = await post(
      `https://graph.facebook.com/${graphVersion()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
      { messaging_product: "whatsapp", recipient_type: "individual", to: handles[0].replace(/\D/g, ""), type: "text", text: { body: text, preview_url: false } }
    );
    if (!err) return { via: "api" };
    console.error("[send] WhatsApp API error:", err);
    return manual("WhatsApp didn't accept the message. It's copied so you can send it yourself.");
  }

  if (channel === "instagram" && instagramApiReady() && apiId) {
    const err = await post(
      `https://graph.instagram.com/${graphVersion()}/me/messages`,
      { Authorization: `Bearer ${process.env.INSTAGRAM_TOKEN}` },
      { recipient: { id: apiId }, message: { text } }
    );
    if (!err) return { via: "api" };
    console.error("[send] Instagram API error:", err);
    return manual("Instagram didn't accept the message. It's copied so you can send it yourself.");
  }

  if (channel === "messenger" && messengerApiReady() && apiId) {
    const err = await post(
      `https://graph.facebook.com/${graphVersion()}/me/messages?access_token=${encodeURIComponent(process.env.MESSENGER_PAGE_TOKEN!)}`,
      {},
      { recipient: { id: apiId }, messaging_type: "RESPONSE", message: { text } }
    );
    if (!err) return { via: "api" };
    console.error("[send] Messenger API error:", err);
    return manual("Messenger didn't accept the message. It's copied so you can send it yourself.");
  }

  return manual();
}
