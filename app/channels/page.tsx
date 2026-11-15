import { readDB, storageMode } from "@/lib/store";
import { aiEnabled } from "@/lib/ai";
import { instagramApiReady, messengerApiReady, whatsappApiReady } from "@/lib/send";
import ChannelsClient, { type ChannelRow } from "./ChannelsClient";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const db = await readDB();
  const clientCount = db.contacts.filter((c) => c.isClient).length;
  const domain = process.env.INBOUND_EMAIL_DOMAIN || "in.gainstalk.com";

  const igVerify = process.env.INSTAGRAM_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN;
  const msVerify = process.env.MESSENGER_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN;
  const intake = Boolean(process.env.INTAKE_TOKEN);
  const rows: ChannelRow[] = [
    {
      channel: "whatsapp",
      name: "WhatsApp Business",
      state: whatsappApiReady() ? "on" : process.env.WHATSAPP_VERIFY_TOKEN ? "partial" : "setup",
      note: whatsappApiReady()
        ? "Connected. Replies send straight from here. Only chats with your chosen clients are read."
        : "Keep chatting on your phone. Connect through Meta to import your last 6 months of chats. Until then, replies open WhatsApp ready to send.",
    },
    {
      channel: "instagram",
      name: "Instagram",
      state: instagramApiReady() && igVerify ? "on" : igVerify ? "partial" : "setup",
      note: instagramApiReady() && igVerify
        ? "Connected. DMs to your professional account arrive here and replies send straight from here."
        : igVerify
          ? "Receiving DMs. Add INSTAGRAM_TOKEN to send replies from here."
          : "DMs to your professional account. Connect it in your Meta app. Until then, paste or share messages in.",
    },
    {
      channel: "messenger",
      name: "Facebook Messenger",
      state: messengerApiReady() && msVerify ? "on" : msVerify ? "partial" : "setup",
      note: messengerApiReady() && msVerify
        ? "Connected. Messages to your Facebook Page arrive here and replies send straight from here."
        : msVerify
          ? "Receiving messages. Add MESSENGER_PAGE_TOKEN to send replies from here."
          : "Messages to your Facebook business Page. Connect the Page in your Meta app.",
    },
    { channel: "tiktok", name: "TikTok", state: "manual", note: "TikTok doesn't let apps read DMs in most regions yet. Share a screenshot and it goes to the right client." },
    {
      channel: "trainerize",
      name: "Trainerize",
      state: intake ? "partial" : "setup",
      note: intake
        ? "Send new Trainerize messages from Zapier to your intake link. Full sync needs their Studio plan."
        : "Pro plans connect through Zapier to an intake link (set INTAKE_TOKEN). Full sync needs their Studio plan.",
    },
    {
      channel: "texts",
      name: "Texts and iMessage",
      state: "manual",
      note: intake
        ? "Apps can't read your texts. Share a message or screenshot, or use the iPhone Shortcut with your intake link."
        : "Apps can't read your texts. Share a message or screenshot to GainsTalk and it goes to the right client.",
    },
  ];

  return (
    <ChannelsClient
      rows={rows}
      clientCount={clientCount}
      ignoredCount={db.settings.ignoredCount}
      forwarding={`${db.settings.forwardingLocalPart}@${domain}`}
      emailReady={Boolean(process.env.INBOUND_EMAIL_TOKEN)}
      ai={aiEnabled()}
      storage={storageMode()}
    />
  );
}
