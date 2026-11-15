import type { CoachPromise, DB, Message } from "./types";
import { uid } from "./util";

const PROMISE_RE = /\b(?:i'?ll|i will|let me|gonna|going to)\s+(?:\w+\s+){0,3}?(send|share|get you|put together|make you|write|email|look into|check)\b([^.!?,]*)/i;
const DAY = "(?:mon|tues|wednes|thurs|fri|satur|sun)day";
const BY_RE = new RegExp(`\\bby\\s+(today|tonight|tomorrow|${DAY}|this week|next week|the weekend)\\b`, "i");
const ANY_RE = new RegExp(`\\b(today|tonight|tomorrow|${DAY}|this week|next week)\\b`, "i");

const STOP = new Set(["the", "a", "an", "your", "my", "for", "by", "to", "you", "send", "her", "his", "their", "and"]);
const words = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter((w) => w && !STOP.has(w));

/** Catch "I'll send your plan by Friday" in the coach's own replies. */
export function detectPromise(db: DB, msg: Message): CoachPromise | null {
  if (msg.direction !== "out") return null;
  const match = msg.text.match(PROMISE_RE);
  if (!match) return null;
  const contact = db.contacts.find((c) => c.id === msg.clientId);
  const first = contact?.name.split(" ")[0] ?? "client";

  // The part right after "send/share/...", minus any deadline words.
  const rest = match[2].replace(BY_RE, "").replace(ANY_RE, "").replace(/\s+/g, " ").trim();
  let what = `${match[1]} ${rest}`.trim();
  if (/\byour\b/i.test(what)) what = what.replace(/\byour\b/i, `${first}'s`);
  else if (/\byou\b/i.test(what)) what = what.replace(/\byou\b/i, first);
  else what = `${what} for ${first}`;
  what = what.charAt(0).toUpperCase() + what.slice(1);

  const dueRaw = msg.text.match(BY_RE)?.[1] ?? msg.text.match(ANY_RE)?.[1];
  const due = dueRaw ? dueRaw.charAt(0).toUpperCase() + dueRaw.slice(1) : undefined;

  // Don't add the same promise twice.
  const key = words(what);
  const dupe = db.promises.some((p) => p.clientId === msg.clientId && !p.done && words(p.text).filter((w) => key.includes(w)).length >= 2);
  if (dupe) return null;

  return {
    id: uid("p_"),
    clientId: msg.clientId,
    text: what,
    due,
    done: false,
    createdAt: new Date().toISOString(),
    sourceMessageId: msg.id,
  };
}
