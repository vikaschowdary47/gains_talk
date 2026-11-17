import { updateDB } from "@/lib/store";
import { uid } from "@/lib/util";
import type { Message, Stat } from "@/lib/types";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

/** "Try a demo client": a made-up client with 3 weeks of chats, so every feature has something to show. */
export async function POST() {
  const now = Date.now();
  const at = (daysAgo: number, hour = 9) => {
    const d = new Date(now - daysAgo * DAY);
    d.setHours(hour, 15, 0, 0);
    return d.toISOString();
  };
  const id = uid("c_");
  const chat: [number, number, "in" | "out", string][] = [
    [20, 8, "in", "Morning! Weighed in at 186.4 lbs, ready to start 💪"],
    [20, 10, "out", "Love it Maya. Plan is in your inbox, start with 3 workouts this week."],
    [17, 19, "in", "Did all 3 workouts! 9,400 steps today"],
    [14, 8, "in", "184.3 lb this morning, slept 7.5h"],
    [14, 9, "out", "Down 2 lb already, great start. Keep the steps up."],
    [11, 20, "in", "8,900 steps, legs are sore from squats"],
    [9, 8, "in", "184.2 lbs. Can we swap Thursday leg day to Friday?"],
    [9, 12, "out", "Friday works. I'll send you a new meal plan by Sunday."],
    [6, 21, "in", "Work's been crazy, barely left my desk. 5,800 steps"],
    [4, 22, "in", "Only slept 5h, 6.1k steps"],
    [2, 23, "in", "Birthday dinner again lol"],
    [1, 8, "in", "184.0 lbs today. Not sure why it's stuck?"],
  ];
  const messages: Message[] = chat.map(([d, h, dir, text], i) => ({
    id: uid(dir === "in" ? "in_" : "out_"),
    clientId: id,
    channel: "instagram",
    direction: dir,
    text,
    at: at(d, h),
    status: dir === "out" ? "replied" : i === chat.length - 1 ? "needs_reply" : "info",
    demo: true,
    statsChecked: true,
  }));
  const msgAt = (needle: string) => messages.find((m) => m.text.includes(needle))!;
  const stat = (kind: string, label: string, value: number, unit: string, needle: string): Stat => {
    const m = msgAt(needle);
    return { id: uid("st_"), kind, label, value, unit, at: m.at, sourceMessageId: m.id };
  };
  const stats: Stat[] = [
    stat("weight", "Weight", 186.4, "lb", "186.4"),
    stat("steps", "Steps", 9400, "steps", "9,400"),
    stat("weight", "Weight", 184.3, "lb", "184.3"),
    stat("sleep", "Sleep", 7.5, "h", "7.5h"),
    stat("steps", "Steps", 8900, "steps", "8,900"),
    stat("weight", "Weight", 184.2, "lb", "184.2"),
    stat("steps", "Steps", 5800, "steps", "5,800"),
    stat("sleep", "Sleep", 5, "h", "Only slept 5h"),
    stat("steps", "Steps", 6100, "steps", "6.1k"),
    stat("weight", "Weight", 184.0, "lb", "184.0"),
  ].sort((a, b) => a.at.localeCompare(b.at));

  await updateDB((db) => {
    db.contacts.push({
      id,
      name: "Maya Johnson (demo)",
      initials: "MJ",
      avatar: "#F8C9B4",
      handles: [{ channel: "instagram", value: "maya.demo" }],
      isClient: true,
      demo: true,
      since: new Date(now - 21 * DAY).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      goals: [{ id: uid("g_"), title: "Lose 10 lb before her June wedding", target: "176 lb" }],
      stats,
      about: {
        summary: "Maya started 3 weeks ago and lost 2 lb fast. Progress has stalled for 2 weeks as work got busy.",
        facts: ["Getting married in June", "Desk job, long hours lately", "Prefers Friday for leg day", "Trains in the morning"],
        updatedAt: new Date(now - DAY).toISOString(),
      },
    });
    db.messages.push(...messages);
    db.promises.push({ id: uid("p_"), clientId: id, text: "Send a new meal plan", due: "Sunday", done: false, createdAt: at(9, 12) } as (typeof db.promises)[number]);
  });
  return Response.json({ ok: true, id });
}

/** Remove the demo client and everything attached to them. */
export async function DELETE() {
  const removed = await updateDB((db) => {
    const ids = new Set(db.contacts.filter((c) => c.demo).map((c) => c.id));
    db.contacts = db.contacts.filter((c) => !ids.has(c.id));
    db.messages = db.messages.filter((m) => !ids.has(m.clientId));
    db.promises = db.promises.filter((p) => !ids.has(p.clientId));
    db.wins = db.wins.filter((w) => !w.clientId || !ids.has(w.clientId));
    return ids.size;
  });
  return Response.json({ ok: true, removed });
}
