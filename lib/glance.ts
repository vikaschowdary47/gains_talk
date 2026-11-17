import type { Contact, DB } from "./types";
import { statSummary } from "./stats";

const DAY = 86_400_000;

/** "3 hours", "2 days", "just now" */
export function plainDuration(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m < 2) return "a minute";
  if (m < 60) return `${m} minutes`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"}`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? "day" : "days"}`;
}

/** Simple, plain-English facts about one client for the top of their page. */
export function clientGlance(db: DB, c: Contact, now = Date.now()) {
  const msgs = db.messages.filter((m) => m.clientId === c.id).sort((a, b) => a.at.localeCompare(b.at));
  const ins = msgs.filter((m) => m.direction === "in");
  const lastIn = ins[ins.length - 1];
  const waiting = msgs.find((m) => m.status === "needs_reply");
  const weekAgo = now - 7 * DAY;
  const theirWeek = ins.filter((m) => Date.parse(m.at) >= weekAgo).length;
  const yourWeek = msgs.filter((m) => m.direction === "out" && Date.parse(m.at) >= weekAgo).length;

  // How long the coach usually takes to answer (median, last 30 days).
  const gaps: number[] = [];
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.direction !== "in" || Date.parse(m.at) < now - 30 * DAY) continue;
    if (i > 0 && msgs[i - 1].direction === "in") continue; // only the first message of their turn
    const reply = msgs.slice(i + 1).find((x) => x.direction === "out");
    if (reply) gaps.push(Date.parse(reply.at) - Date.parse(m.at));
  }
  gaps.sort((a, b) => a - b);
  const replyTime = gaps.length ? gaps[Math.floor(gaps.length / 2)] : null;

  const trends = statSummary(c.stats)
    .filter((s) => s.change !== null && s.change !== 0)
    .map((s) => `${s.label} is ${s.change! > 0 ? "up" : "down"} ${Math.abs(s.change!)} ${s.latest.unit} since ${new Date(s.points[0].at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`);

  return {
    lastIn: lastIn ? { ago: plainDuration(now - Date.parse(lastIn.at)), quietDays: Math.floor((now - Date.parse(lastIn.at)) / DAY) } : null,
    waiting: waiting ? plainDuration(now - Date.parse(waiting.at)) : null,
    theirWeek,
    yourWeek,
    replyTime: replyTime !== null ? plainDuration(replyTime) : null,
    trends,
    total: msgs.length,
  };
}
