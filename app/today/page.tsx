import { redirect } from "next/navigation";
import { readDB } from "@/lib/store";
import { lastInbound, needsReply, quietClients } from "@/lib/queries";
import { timeLabel } from "@/lib/util";
import TodayClient from "./TodayClient";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const db = await readDB();
  if (!db.settings.onboarded) redirect("/welcome");
  const byId = new Map(db.contacts.map((c) => [c.id, c]));

  const queue = needsReply(db).map((m) => {
    const c = byId.get(m.clientId)!;
    return {
      id: m.id,
      text: m.text,
      time: timeLabel(m.at),
      channel: m.channel,
      client: { id: c.id, name: c.name, initials: c.initials, avatar: c.avatar },
      context: c.goals[0] ? `Goal: ${c.goals[0].title}${c.goals[0].target ? `, ${c.goals[0].target}` : ""}` : null,
    };
  });

  const quiet = quietClients(db).map(({ contact, days }) => ({
    id: contact.id,
    name: contact.name,
    initials: contact.initials,
    avatar: contact.avatar,
    days,
    lastMessageId: lastInbound(db, contact.id)?.id ?? null,
  }));

  const promises = db.promises
    .filter((p) => !p.done)
    .map((p) => ({ id: p.id, text: p.text, due: p.due ?? null, clientId: p.clientId }));

  // "Mon 6:00 PM" style labels, sorted by how soon that weekday comes up.
  const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const todayIdx = new Date().getDay();
  const soon = (when: string) => {
    const d = DAYS.indexOf(when.slice(0, 3).toLowerCase());
    return d < 0 ? 99 : (d - todayIdx + 7) % 7;
  };
  const sessions = db.contacts
    .filter((c) => c.isClient && c.nextSession)
    .map((c) => ({ id: c.id, name: c.name, when: c.nextSession!.when, topic: c.nextSession!.topic }))
    .sort((a, b) => soon(a.when) - soon(b.when));

  const pending = db.pending.map((p) => ({ id: p.id, name: p.name, channel: p.handle.channel, handle: p.handle.value, seen: timeLabel(p.firstSeen) }));

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <TodayClient
      coachName={db.settings.coachName}
      today={today}
      queue={queue}
      quiet={quiet}
      promises={promises}
      sessions={sessions}
      pending={pending}
      clients={db.contacts.filter((c) => c.isClient).map((c) => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name))}
      defaultAngle={db.settings.style.defaultAngle}
    />
  );
}
