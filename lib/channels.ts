import type { Channel } from "./types";

export interface ChannelMeta {
  label: string;
  tint: string;
  ink: string;
  icon: "chat" | "photo" | "mail" | "note" | "app" | "text";
}

export const CHANNELS: Record<Channel, ChannelMeta> = {
  whatsapp: { label: "WhatsApp", tint: "#DFF6EC", ink: "#0E6B4C", icon: "chat" },
  instagram: { label: "Instagram", tint: "#FDE2EE", ink: "#A3195B", icon: "photo" },
  messenger: { label: "Messenger", tint: "#EDE7FF", ink: "#5A35C9", icon: "chat" },
  tiktok: { label: "TikTok", tint: "#DDF4F5", ink: "#0B6A70", icon: "note" },
  trainerize: { label: "Trainerize", tint: "#E6EEF5", ink: "#2F5470", icon: "app" },
  email: { label: "Email", tint: "#E3E8FF", ink: "#2638C9", icon: "mail" },
  texts: { label: "Texts", tint: "#FFF1C7", ink: "#5C4300", icon: "text" },
};

export const ALL_CHANNELS = Object.keys(CHANNELS) as Channel[];

export function isChannel(v: unknown): v is Channel {
  return typeof v === "string" && v in CHANNELS;
}

/** Link that opens the client's chat with the reply ready, when the channel
 *  can't be sent to directly yet. The reply is also copied to the clipboard. */
export function manualSendUrl(channel: Channel, handle: string | undefined, text: string): string | undefined {
  const t = encodeURIComponent(text);
  if (!handle) return undefined;
  switch (channel) {
    case "whatsapp": {
      const digits = handle.replace(/\D/g, "");
      return digits ? `https://wa.me/${digits}?text=${t}` : undefined;
    }
    case "texts": {
      const digits = handle.replace(/[^\d+]/g, "");
      return digits ? `sms:${digits}&body=${t}` : undefined;
    }
    case "email":
      return `mailto:${handle}?body=${t}`;
    case "instagram":
      return `https://ig.me/m/${handle.replace(/^@/, "")}`;
    case "messenger":
      return `https://m.me/${handle}`;
    default:
      return undefined;
  }
}
