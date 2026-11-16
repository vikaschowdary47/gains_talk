import TimeZoneSync from "@/components/TimeZoneSync";
import { readDB, storageMode } from "@/lib/store";
import { timeLabel } from "@/lib/util";
import { aiEnabled } from "@/lib/ai";
import { instagramApiReady, messengerApiReady, whatsappApiReady } from "@/lib/send";
import { instagramLoginReady, instagramMissing } from "@/lib/instagram";
import ChannelsClient, { type ChannelRow } from "./ChannelsClient";

export const dynamic = "force-dynamic";

export default async function ChannelsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const db = await readDB();
  const ig = db.settings.instagram;
  const igNotice =
    sp.ig === "connected" ? `Instagram connected${ig?.username ? ` as @${ig.username}` : ""}.`
    : sp.ig === "error" ? `Instagram didn't connect. ${typeof sp.reason === "string" ? sp.reason : ""}`.trim()
    : sp.ig === "setup" ? `Add ${instagramMissing().join(", ")} in Vercel first, then redeploy.`
    : undefined;
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
      state: ig ? "on" : instagramApiReady(db) && igVerify ? "on" : "setup",
      note: ig
        ? `Connected as ${ig.username ? `@${ig.username}` : "your professional account"}. DMs arrive here and replies send straight from here.`
        : instagramApiReady(db)
          ? "Connected with a token from your Meta app. DMs arrive here and replies send straight from here."
        : instagramLoginReady()
          ? "Connect your Instagram professional account (Business or Creator). DMs then arrive here, and replies send from here."
          : `DMs to your professional account. GainsTalk can't see ${instagramMissing().join(", ")} in Vercel yet. Add ${instagramMissing().length > 1 ? "them" : "it"} for Production and redeploy.`,
      connect: !ig && !instagramApiReady(db) && instagramLoginReady() ? { href: "/api/instagram/connect", label: "Connect Instagram" } : undefined,
      disconnect: ig ? "instagram" : undefined,
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

  // What Meta last sent us, per channel, so setup problems are visible.
  for (const r of rows) {
    if (r.channel !== "whatsapp" && r.channel !== "instagram" && r.channel !== "messenger") continue;
    const last = (db.webhookLog ?? []).find((e) => e.channel === r.channel);
    if (last) r.lastHook = { ...last, when: timeLabel(last.at) };
    else if (r.state !== "setup") r.lastHook = null;
  }

  return (
    <>
    <TimeZoneSync saved={db.settings.timeZone} />
    <ChannelsClient
      rows={rows}
      clientCount={clientCount}
      ignoredCount={db.settings.ignoredCount}
      forwarding={`${db.settings.forwardingLocalPart}@${domain}`}
      emailReady={Boolean(process.env.INBOUND_EMAIL_TOKEN)}
      ai={aiEnabled()}
      storage={storageMode()}
      notice={igNotice}
    />
    </>
  );
}
