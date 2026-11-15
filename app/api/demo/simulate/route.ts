import { updateDB } from "@/lib/store";
import { ingest } from "@/lib/ingest";
import { isChannel } from "@/lib/channels";
import { isSampleContact } from "@/lib/seed";
import type { Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

const SAMPLES: Record<Channel, string[]> = {
  whatsapp: ["Quick one: can I swap Thursday's run for the bike? Knee feels a bit tight.", "Done with today's workout!! Legs are jelly 😅 same plan tomorrow?"],
  instagram: ["Saw your reel on protein timing 👀 does that apply if I train fasted at 6am?", "Hit a new PR on deadlift today!! 102kg"],
  messenger: ["Hey! December payment went through. Are we still doing the check-in call Sunday?", "Can we move Friday's session to Saturday morning?"],
  tiktok: ["Tried the 10 min core thing from your video. Ok to do it every day?", "How many steps a day should I actually aim for?"],
  trainerize: ["Logged today's session. Last set of squats felt way heavier than last week, should I drop the weight?", "Missed Monday's workout, do I just pick up where I left off?"],
  email: ["Attaching my food log for the week. Weekends were rough, honestly.", "Work trip next week. Can you send a hotel gym version of the plan?"],
  texts: ["Running 10 late for our session, sorry!!", "Is it ok if I do yoga instead of the rest day walk?"],
};

/**
 * Demo helper: drops a realistic client message into Today, as if it came
 * through that channel. Pass { newPerson: true } to show the privacy gate.
 */
const STRANGERS = ["Jamie Brooks", "Taylor Kim", "Morgan Diaz", "Riley Chen", "Casey Nolan"];

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { channel?: string; newPerson?: boolean };
  const channel: Channel = isChannel(body.channel) ? body.channel : "whatsapp";
  const text = SAMPLES[channel][Math.floor(Math.random() * SAMPLES[channel].length)];

  const out = await updateDB((db) => {
    if (body.newPerson) {
      const n = Math.floor(1000 + Math.random() * 9000);
      const handle = channel === "whatsapp" || channel === "texts" ? `1312555${n}` : channel === "email" ? `new.person${n}@example.com` : `newperson${n}`;
      const r = ingest(db, { channel, handle, name: STRANGERS[Math.floor(Math.random() * STRANGERS.length)], text, demo: true });
      return { stored: r.stored, newPerson: true };
    }
    // Prefer the sample clients, so test messages never come from a real person.
    const all = db.contacts.filter((c) => c.isClient);
    const samples = all.filter(isSampleContact);
    const clients = samples.length ? samples : all;
    const pick = clients.find((c) => c.handles.some((h) => h.channel === channel)) ?? clients[Math.floor(Math.random() * clients.length)];
    if (!pick) return { stored: false, error: "Choose at least one client first." };
    const handle = pick.handles.find((h) => h.channel === channel)?.value;
    if (!handle) pick.handles.push({ channel, value: `demo-${pick.id}` });
    const r = ingest(db, { channel, handle: handle ?? `demo-${pick.id}`, name: pick.name, text, demo: true });
    return r.stored ? { stored: true, client: pick.name } : { stored: false };
  });
  return Response.json({ ok: true, channel, ...out });
}
