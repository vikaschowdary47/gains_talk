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

/**
 * Send a reply the coach approved. WhatsApp goes out through the Cloud API when
 * it's configured. Everything else (and WhatsApp before setup) returns a link:
 * the app copies the reply and opens the chat, and the coach taps send.
 */
export async function sendReply(contact: Contact, channel: Channel, text: string): Promise<SendResult> {
  const handle = contact.handles.find((h) => h.channel === channel)?.value;

  if (channel === "whatsapp" && whatsappApiReady() && handle) {
    try {
      const res = await fetch(`https://graph.facebook.com/${graphVersion()}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: handle.replace(/\D/g, ""),
          type: "text",
          text: { body: text, preview_url: false },
        }),
      });
      if (res.ok) return { via: "api" };
      const err = await res.text();
      console.error("[send] WhatsApp API error:", err);
      return { via: "manual", openUrl: manualSendUrl(channel, handle, text), error: "WhatsApp didn't accept the message. It's copied so you can send it yourself." };
    } catch (e) {
      console.error("[send] WhatsApp request failed:", e);
    }
  }
  return { via: "manual", openUrl: manualSendUrl(channel, handle, text) };
}
