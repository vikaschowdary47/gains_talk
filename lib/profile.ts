import "server-only";
import type { CoachPromise, Goal } from "./types";
import { readDB, updateDB } from "./store";
import { aiEnabled, askClaude, parseJSON } from "./ai";
import { uid, firstName } from "./util";

interface Learned {
  summary?: string;
  goals?: { title: string; target?: string }[];
  facts?: string[];
  promises?: { text: string; due?: string }[];
}

/**
 * Read a client's messages once and fill in their profile: a two-line summary,
 * goals, useful facts (injuries, schedule, food) and promises the coach hasn't kept yet.
 * Only adds; never removes what the coach typed.
 */
export async function buildProfile(clientId: string): Promise<boolean> {
  if (!aiEnabled()) return false;
  const db = await readDB();
  const c = db.contacts.find((x) => x.id === clientId && x.isClient);
  if (!c) return false;
  const msgs = db.messages
    .filter((m) => m.clientId === clientId && m.text)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-60);
  if (msgs.length < 2) return false;
  const first = firstName(c.name);
  const transcript = msgs.map((m) => `[${m.at.slice(0, 10)}] ${m.direction === "in" ? first : "Coach"}: ${m.text}`).join("\n");

  let learned: Learned | null = null;
  try {
    const raw = await askClaude(
      `You help a fitness coach keep notes on a client. Read their chat and write only what helps the coach coach them.
Useful: goals and deadlines, body numbers, training schedule, injuries or pain, food habits and preferences, work or life things that affect training, how they like to be coached.
Never write about the chat itself: not their name, not how short or long their messages are, not what was said when, not that little is known. No meta commentary.
Only include things actually said. Never guess or diagnose. Plain, everyday English.
If the chat has nothing useful (just greetings or "ok"), return {"summary":"","goals":[],"facts":[],"promises":[]}.
Return only JSON:
{"summary":"One or two short sentences about the client as a person: what they're working toward and how it's going.",
"goals":[{"title":"Lose weight for wedding","target":"15 lb by June"}],
"facts":["Bad left knee, avoids deep squats","Trains mornings before work","Vegetarian"],
"promises":[{"text":"Send a new meal plan","due":"Friday"}]}
promises = specific things the COACH said they would do and hasn't clearly done yet (not vague "I'll get back to you"). Keep each fact under 12 words. Up to 3 goals, 8 facts, 4 promises.`,
      `Client: ${c.name}\n\n${transcript}`,
      700,
    );
    learned = parseJSON<Learned>(raw);
  } catch {
    return false;
  }
  if (!learned) return false;

  await updateDB((fresh) => {
    const x = fresh.contacts.find((y) => y.id === clientId);
    if (!x) return;
    const facts = (learned!.facts ?? []).map((f) => f.trim()).filter(Boolean).slice(0, 8);
    x.about = { summary: (learned!.summary ?? "").trim(), facts, updatedAt: new Date().toISOString() };
    if (x.goals.length === 0) {
      x.goals = (learned!.goals ?? []).slice(0, 3).filter((g) => g.title).map<Goal>((g) => ({ id: uid("g_"), title: g.title, target: g.target }));
    }
    const open = new Set(fresh.promises.filter((p) => p.clientId === clientId).map((p) => p.text.toLowerCase()));
    for (const p of (learned!.promises ?? []).slice(0, 4)) {
      if (!p.text || open.has(p.text.toLowerCase())) continue;
      fresh.promises.push({ id: uid("p_"), clientId, text: p.text, due: p.due, done: false, createdAt: new Date().toISOString() } as CoachPromise);
    }
  });
  return true;
}
