import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { DB, Stat } from "./types";
import { readDB, updateDB } from "./store";
import { aiEnabled } from "./ai";
import { uid } from "./util";

const MODEL = process.env.ANTHROPIC_STATS_MODEL || "claude-haiku-5-5";
const HAS_NUMBER = /\d/;

type Found = Omit<Stat, "id" | "at" | "sourceMessageId">;

/** Without AI: catch the common case, a body weight like "182.4 lbs" or "79kg". */
function quickWeight(text: string): Found[] {
  const m = text.match(/(?:^|[^\d.])(\d{2,3}(?:\.\d)?)\s?(lbs?|pounds|kgs?|kilos)\b/i);
  if (!m) return [];
  const kg = /^k/i.test(m[2]);
  return [{ kind: "weight", label: "Weight", value: Number(m[1]), unit: kg ? "kg" : "lb" }];
}

async function aiStats(text: string, name: string): Promise<Found[]> {
  const res = await new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }).messages.create({
    model: MODEL,
    max_tokens: 300,
    system: `You read one message a fitness coaching client sent their coach and pull out measurements the client is reporting about themselves right now.
Log: body weight, body fat %, waist or other body measurements, steps, sleep hours, calories, protein grams, water, resting heart rate, and lifts (as the weight lifted, with reps in the label, e.g. "Squat 5 reps").
Do not log goals or targets ("want to hit 170"), guesses, plans, past numbers they're comparing to, or numbers about other people.
Return only JSON: {"stats":[{"kind":"weight","label":"Weight","value":182.4,"unit":"lb"}]}. kind is a short snake_case key (weight, body_fat, waist, steps, sleep, calories, protein, water, resting_hr, or the lift name like squat). Use the unit they used. Empty list if nothing qualifies.`,
    messages: [{ role: "user", content: `${name} wrote: "${text}"` }],
  });
  const raw = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json) as { stats?: Found[] };
  return (parsed.stats ?? []).filter((s) => s && typeof s.value === "number" && isFinite(s.value) && s.kind && s.label).slice(0, 6);
}

/**
 * Scan new client messages for numbers worth logging (weight, steps, lifts...)
 * and add them to the client's profile. Safe to call often: each message is read once.
 */
export async function logPendingStats(limit = 25): Promise<number> {
  const db = await readDB();
  const clients = new Map(db.contacts.filter((c) => c.isClient).map((c) => [c.id, c]));
  const todo = db.messages
    .filter((m) => m.direction === "in" && !m.statsChecked && clients.has(m.clientId) && !m.demo)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
  if (todo.length === 0) return 0;

  const found = new Map<string, Found[]>();
  for (const m of todo) {
    if (!HAS_NUMBER.test(m.text)) continue;
    try {
      found.set(m.id, aiEnabled() ? await aiStats(m.text, clients.get(m.clientId)!.name.split(" ")[0]) : quickWeight(m.text));
    } catch (e) {
      console.error("[stats]", e);
      found.set(m.id, quickWeight(m.text));
    }
  }

  let added = 0;
  await updateDB((fresh: DB) => {
    for (const m of todo) {
      const msg = fresh.messages.find((x) => x.id === m.id);
      if (!msg || msg.statsChecked) continue;
      msg.statsChecked = true;
      const list = found.get(m.id) ?? [];
      const c = fresh.contacts.find((x) => x.id === m.clientId);
      if (!c || list.length === 0) continue;
      c.stats ??= [];
      for (const s of list) {
        if (c.stats.some((x) => x.sourceMessageId === m.id && x.kind === s.kind)) continue;
        c.stats.push({ id: uid("st_"), kind: s.kind, label: s.label, value: s.value, unit: s.unit, at: m.at, sourceMessageId: m.id });
        added++;
      }
      c.stats.sort((a, b) => a.at.localeCompare(b.at));
    }
  });
  return added;
}

/** Latest value per stat, with the change since the first one logged. */
export function statSummary(stats: Stat[] = []) {
  const byKind = new Map<string, Stat[]>();
  for (const s of stats) byKind.set(s.kind, [...(byKind.get(s.kind) ?? []), s]);
  return [...byKind.values()].map((list) => {
    const first = list[0];
    const last = list[list.length - 1];
    const sameUnit = list.filter((s) => s.unit === last.unit);
    const change = sameUnit.length > 1 ? Math.round((last.value - sameUnit[0].value) * 10) / 10 : null;
    return { kind: last.kind, label: last.label, latest: last, first, change, points: sameUnit };
  });
}

/** One line for the AI drafts, e.g. "Weight 182 lb (Nov 15), change -3 since Nov 1". */
export function statsForPrompt(stats: Stat[] = []): string {
  return statSummary(stats)
    .map((s) => `${s.label} ${s.latest.value} ${s.latest.unit} (${s.latest.at.slice(0, 10)})${s.change !== null ? `, ${s.change > 0 ? "+" : ""}${s.change} since ${s.points[0].at.slice(0, 10)}` : ""}`)
    .join("; ");
}
