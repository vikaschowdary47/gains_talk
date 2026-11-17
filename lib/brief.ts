import "server-only";
import type { Brief, Contact, DB, Signal, Stat } from "./types";
export type { Brief, Signal } from "./types";
import { readDB, updateDB } from "./store";
import { aiEnabled, askClaude } from "./ai";
import { plainDuration } from "./glance";

const DAY = 86_400_000;

const fmt = (n: number, unit = "") => `${Math.round(n * 10) / 10 >= 1000 ? Math.round(n).toLocaleString("en-US") : Math.round(n * 10) / 10}${unit ? ` ${unit}` : ""}`;
const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);
const within = (s: Stat[], from: number, to: number) => s.filter((x) => Date.parse(x.at) >= from && Date.parse(x.at) < to);
const avg = (s: Stat[]) => s.reduce((t, x) => t + x.value, 0) / s.length;

function wantsLoss(c: Contact): boolean {
  const text = [...c.goals.map((g) => `${g.title} ${g.target ?? ""}`), c.about?.summary ?? ""].join(" ").toLowerCase();
  if (/gain|bulk|build muscle|put on/.test(text) && !/lose|loss|cut|fat/.test(text)) return false;
  return /lose|loss|cut|fat|lean|drop|slim|weight/.test(text) || c.goals.length === 0;
}

/** Everything the brief says that plain code can work out, for free. */
export function computeSignals(db: DB, c: Contact, now = Date.now()): Signal[] {
  const out: Signal[] = [];
  const stats = c.stats ?? [];
  const byKind = (k: string) => stats.filter((s) => s.kind === k);

  // Weight: the last 14 days.
  const weight = byKind("weight");
  if (weight.length) {
    const unit = weight[weight.length - 1].unit;
    const recent = within(weight.filter((w) => w.unit === unit), now - 14 * DAY, now + DAY);
    const latest = weight[weight.length - 1];
    if (recent.length >= 2 && Date.parse(recent[recent.length - 1].at) - Date.parse(recent[0].at) >= 7 * DAY) {
      const change = recent[recent.length - 1].value - recent[0].value;
      const flat = Math.abs(change) < (unit === "kg" ? 0.25 : 0.5);
      const loss = wantsLoss(c);
      if (flat) out.push({ key: "weight", level: loss ? "warn" : "info", label: "Weight, 14 days", value: fmt(latest.value, unit), detail: `Flat (was ${fmt(recent[0].value)})` });
      else if ((change < 0) === loss) out.push({ key: "weight", level: "good", label: "Weight, 14 days", value: fmt(latest.value, unit), detail: `${change < 0 ? "Down" : "Up"} ${fmt(Math.abs(change), unit)}` });
      else out.push({ key: "weight", level: "warn", label: "Weight, 14 days", value: fmt(latest.value, unit), detail: `${change < 0 ? "Down" : "Up"} ${fmt(Math.abs(change), unit)}, against the goal` });
    } else {
      out.push({ key: "weight", level: "info", label: "Weight", value: fmt(latest.value, unit), detail: `Last logged ${plainDuration(now - Date.parse(latest.at))} ago` });
    }
  }

  // Habits: this week vs last week.
  const weekly: { kind: string; label: string; badIfDown: boolean; unit?: string }[] = [
    { kind: "steps", label: "Daily steps", badIfDown: true },
    { kind: "sleep", label: "Sleep", badIfDown: true, unit: "h" },
    { kind: "calories", label: "Calories reported", badIfDown: false },
    { kind: "protein", label: "Protein reported", badIfDown: true, unit: "g" },
  ];
  for (const w of weekly) {
    const all = byKind(w.kind);
    if (!all.length) continue;
    const thisWeek = within(all, now - 7 * DAY, now + DAY);
    const lastWeek = within(all, now - 14 * DAY, now - 7 * DAY);
    if (thisWeek.length && lastWeek.length) {
      const a = avg(thisWeek), b = avg(lastWeek);
      const p = pct(a, b);
      const big = Math.abs(p) >= (w.kind === "calories" ? 10 : 20);
      const bad = big && (w.badIfDown ? p < 0 : p > 0);
      out.push({ key: w.kind, level: bad ? "warn" : big ? "good" : "info", label: w.label, value: fmt(a, w.unit), detail: big ? `${p > 0 ? "Up" : "Down"} ${Math.abs(p)}% (was ${fmt(b)})` : "About the same as last week" });
    } else if (thisWeek.length) {
      out.push({ key: w.kind, level: "info", label: w.label, value: fmt(avg(thisWeek), w.unit), detail: "This week" });
    }
  }

  // Conversation: quiet, waiting, promises.
  const msgs = db.messages.filter((m) => m.clientId === c.id).sort((a, b) => a.at.localeCompare(b.at));
  const lastIn = [...msgs].reverse().find((m) => m.direction === "in");
  const waiting = msgs.find((m) => m.status === "needs_reply");
  if (waiting && now - Date.parse(waiting.at) > DAY) {
    out.push({ key: "waiting", level: "warn", label: "Waiting on you", value: plainDuration(now - Date.parse(waiting.at)), detail: "Since their last message" });
  } else if (lastIn) {
    const quiet = Math.floor((now - Date.parse(lastIn.at)) / DAY);
    if (quiet >= 5) out.push({ key: "quiet", level: "warn", label: "Quiet", value: `${quiet} days`, detail: "No message from them" });
  }
  const overdue = db.promises.filter((p) => p.clientId === c.id && !p.done);
  if (overdue.length) out.push({ key: "promises", level: "warn", label: "Your promises", value: `${overdue.length} open`, detail: overdue[0].text.slice(0, 40) });

  return out;
}

/** Recent things the client said that back up the brief. */
function evidence(db: DB, c: Contact, signals: Signal[]): { text: string; at: string }[] {
  const keys = new Set(signals.filter((s) => s.level === "warn").map((s) => s.key));
  const words: RegExp[] = [];
  if (keys.has("weight") || keys.has("calories")) words.push(/eat|ate|dinner|lunch|party|birthday|drink|beer|wine|cheat|snack|food|takeout|order/i);
  if (keys.has("steps") || keys.has("sleep") || keys.has("quiet")) words.push(/busy|work|tired|sick|travel|trip|stress|sleep|desk|late|exhausted/i);
  const ins = db.messages.filter((m) => m.clientId === c.id && m.direction === "in" && m.text && !m.text.startsWith("[")).sort((a, b) => b.at.localeCompare(a.at));
  const recent = ins.filter((m) => Date.now() - Date.parse(m.at) < 21 * DAY);
  const hits = recent.filter((m) => words.some((w) => w.test(m.text)));
  return (hits.length ? hits : recent).slice(0, 2).map((m) => ({ text: m.text.length > 120 ? `${m.text.slice(0, 117)}…` : m.text, at: m.at }));
}

function statusOf(signals: Signal[], messages: number): Brief["status"] {
  if (messages < 2 && signals.length === 0) return "new";
  if (signals.some((s) => s.level === "warn")) return "check-in";
  if (signals.some((s) => s.level === "good")) return "on-track";
  return "steady";
}

/** The free version of the brief: one or two sentences built from the signals. */
function ruleText(first: string, signals: Signal[], status: Brief["status"]): string {
  if (status === "new") return `Not much to go on yet. As ${first} shares weights, steps or how their week went, trends will show up here.`;
  const warn = signals.filter((s) => s.level === "warn");
  const good = signals.filter((s) => s.level === "good");
  // Each clause names the client the first time, then says "they".
  const clause = (s: Signal, subj: string) => {
    const poss = subj === first ? `${first}'s` : "their";
    const change = s.detail.split(" (")[0].toLowerCase();
    switch (s.key) {
      case "weight": return s.detail.startsWith("Flat") ? `${poss} weight hasn't moved in 2 weeks` : `${poss} weight is ${change}`;
      case "steps": return `${poss} daily steps are ${change}`;
      case "sleep": return `${poss} sleep is ${change}`;
      case "calories": return `${poss} reported calories are ${change}`;
      case "protein": return `${poss} reported protein is ${change}`;
      case "waiting": return `${subj} ${subj === first ? "has" : "have"} been waiting ${s.value} for your reply`;
      case "quiet": return `${subj} ${subj === first ? "hasn't" : "haven't"} messaged in ${s.value}`;
      case "promises": return `you have ${s.value} ${s.value.startsWith("1 ") ? "promise" : "promises"} to keep`;
      default: return `${poss} ${s.label.toLowerCase()} is ${change}`;
    }
  };
  const sentence = (list: Signal[]) => {
    const parts = list.map((s, i) => clause(s, i === 0 ? first : "they"));
    const joined = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
    return joined.charAt(0).toUpperCase() + joined.slice(1);
  };
  if (warn.length) return `${sentence(warn.slice(0, 3))}. Worth asking how their week has been.`;
  if (good.length) return `${sentence(good.slice(0, 2))}. A quick "nice work" would land well.`;
  return `Nothing stands out for ${first} right now. Things look steady.`;
}

function fingerprintOf(db: DB, c: Contact): string {
  const msgs = db.messages.filter((m) => m.clientId === c.id);
  const last = msgs.reduce((a, m) => (m.at > a ? m.at : a), "");
  return `${msgs.length}:${last}:${c.stats?.length ?? 0}:${db.promises.filter((p) => p.clientId === c.id && !p.done).length}`;
}

/** Build the brief from code alone (free). The client page uses this when no saved brief is current. */
export function quickBrief(db: DB, c: Contact): Brief {
  const signals = computeSignals(db, c);
  const messages = db.messages.filter((m) => m.clientId === c.id).length;
  const status = statusOf(signals, messages);
  return {
    status,
    text: ruleText(c.name.split(" ")[0], signals, status),
    signals,
    quotes: evidence(db, c, signals),
    basis: { messages, numbers: c.stats?.length ?? 0 },
    fingerprint: fingerprintOf(db, c),
    updatedAt: new Date().toISOString(),
    by: "rules",
  };
}

/** The saved brief if it's still current, else a fresh free one. Never calls AI. */
export function currentBrief(db: DB, c: Contact): Brief {
  const saved = c.brief;
  if (saved && saved.fingerprint === fingerprintOf(db, c) && Date.now() - Date.parse(saved.updatedAt) < 7 * DAY) {
    return { ...saved, signals: computeSignals(db, c) }; // numbers stay live; wording is cached
  }
  return quickBrief(db, c);
}

/**
 * Rewrite the brief's sentences with Claude, but only when something changed.
 * Claude gets the computed signals and a few short quotes, never the whole chat,
 * so each refresh costs a few hundred tokens.
 */
export async function refreshBrief(clientId: string, force = false): Promise<boolean> {
  const db = await readDB();
  const c = db.contacts.find((x) => x.id === clientId && x.isClient);
  if (!c) return false;
  const base = quickBrief(db, c);
  const saved = c.brief;
  if (!force && saved?.fingerprint === base.fingerprint) return false;
  // Throttle: at most every 6 hours unless a new number was logged.
  if (!force && saved && Date.now() - Date.parse(saved.updatedAt) < 6 * 3_600_000 && saved.basis.numbers === base.basis.numbers) return false;

  let brief = base;
  if (aiEnabled() && base.status !== "new") {
    try {
      const first = c.name.split(" ")[0];
      const facts = base.signals.map((s) => `- ${s.label}: ${s.value} (${s.detail})${s.level === "warn" ? " [needs attention]" : s.level === "good" ? " [good]" : ""}`).join("\n");
      const quotes = base.quotes.map((q) => `- "${q.text}"`).join("\n");
      const text = await askClaude(
        `You write a 2-sentence brief for a fitness coach about one client. Plain, warm, everyday English.
Sentence 1: what stands out, using the numbers given. Sentence 2: one suggested next step for the coach, framed as a question to ask or a small action.
Only use the facts and quotes given. Numbers are what the client reported, so say "reported" for food. Never diagnose, never judge, no medical advice. No lists, no headings, under 55 words.`,
        `Client: ${first}\nWhat we know: ${c.about?.summary ?? "no notes yet"}\nFacts:\n${facts || "- none"}\nRecent things they said:\n${quotes || "- none"}`,
        200,
      );
      if (text && text.length > 20) brief = { ...base, text: text.replace(/^["']|["']$/g, "").trim(), by: "ai" };
    } catch {
      /* keep the free version */
    }
  }
  await updateDB((fresh) => {
    const x = fresh.contacts.find((y) => y.id === clientId);
    if (x) x.brief = brief;
  });
  return brief.by === "ai";
}
