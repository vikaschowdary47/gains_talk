import { readDB } from "@/lib/store";
import { aiEnabled } from "@/lib/ai";
import { whatsappApiReady } from "@/lib/send";
import ChannelsClient, { type ChannelRow } from "./ChannelsClient";

export const dynamic = "force-dynamic";

export default function ChannelsPage() {
  const db = readDB();
  const clientCount = db.contacts.filter((c) => c.isClient).length;
  const domain = process.env.INBOUND_EMAIL_DOMAIN || "in.gainstalk.com";

  const rows: ChannelRow[] = [
    {
      channel: "whatsapp",
      name: "WhatsApp Business",
      state: whatsappApiReady() ? "on" : process.env.WHATSAPP_VERIFY_TOKEN ? "partial" : "setup",
      note: whatsappApiReady()
        ? "Connected. Only chats with your chosen clients are read."
        : "Keep chatting on your phone. Connect through Meta to import your last 6 months of chats. Until then, replies open WhatsApp ready to send.",
    },
    {
      channel: "instagram",
      name: "Instagram",
      state: process.env.INSTAGRAM_VERIFY_TOKEN ? "partial" : "setup",
      note: "Messages to your professional account. Needs a Meta app. Until then, paste or share messages in.",
    },
    { channel: "messenger", name: "Facebook Messenger", state: "soon", note: "Messages to your Facebook business Page. Coming next." },
    { channel: "tiktok", name: "TikTok", state: "soon", note: "Business accounts only, and not in every region yet. Share screenshots in for now." },
    { channel: "trainerize", name: "Trainerize", state: "soon", note: "Full sync needs their Studio plan. Pro plans connect through Zapier." },
    { channel: "texts", name: "Texts and iMessage", state: "manual", note: "Apps can't read your texts. Share a message or screenshot to GainsTalk and it goes to the right client." },
  ];

  return (
    <ChannelsClient
      rows={rows}
      clientCount={clientCount}
      ignoredCount={db.settings.ignoredCount}
      forwarding={`${db.settings.forwardingLocalPart}@${domain}`}
      emailReady={Boolean(process.env.INBOUND_EMAIL_TOKEN)}
      ai={aiEnabled()}
    />
  );
}
