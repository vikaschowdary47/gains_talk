import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Contact, DB, Drafts, Message, Win } from "./types";
import { enforceStyle, styleRulesText } from "./style";
import { CHANNELS } from "./channels";
import { uid } from "./util";
import { statsForPrompt } from "./stats";
import { explainAiError, recordAiStatus } from "./ai-status";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

export { ask as askClaude, parseJSON };

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function ask(system: string, content: Anthropic.MessageParam["content"], maxTokens = 900): Promise<string> {
  let res: Anthropic.Message;
  try {
    res = await client().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content }],
    });
  } catch (err) {
    await recordAiStatus(false, explainAiError(err));
    throw err;
  }
  await recordAiStatus(true);
  return res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

function parseJSON<T>(raw: string): T | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Drafts in three angles                                              */
/* ------------------------------------------------------------------ */

function contextFor(db: DB, msg: Message, contact: Contact) {
  const thread = db.messages
    .filter((m) => m.clientId === contact.id)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-10);
  const coachSamples = [
    ...db.settings.style.samples,
    ...db.messages.filter((m) => m.direction === "out").map((m) => m.text),
  ].slice(-12);
  const promises = db.promises.filter((p) => p.clientId === contact.id && !p.done);
  const basedOn: string[] = [];
  contact.goals.slice(0, 2).forEach((g) => basedOn.push(`Goal: ${g.title}${g.target ? `, ${g.target}` : ""}`));
  if (contact.nextSession) basedOn.push(`Next session: ${contact.nextSession.when}`);
  promises.forEach((p) => basedOn.push(`You promised: ${p.text}`));
  return { thread, coachSamples, promises, basedOn: basedOn.slice(0, 3) };
}

export type DraftMode = "reply" | "nudge";

export async function generateDrafts(db: DB, msg: Message, mode: DraftMode = "reply"): Promise<Drafts> {
  const contact = db.contacts.find((c) => c.id === msg.clientId);
  if (!contact) throw new Error("Client not found");
  const ctx = contextFor(db, msg, contact);
  const style = db.settings.style;

  const quietDays = Math.floor((Date.now() - new Date(msg.at).getTime()) / 86_400_000);
  if (!aiEnabled()) return mode === "nudge" ? demoNudge(contact, ctx.basedOn, db, quietDays) : demoDrafts(msg, contact, ctx.basedOn, db);

  const system = `You draft replies for a coach named ${db.settings.coachName}. The coach reviews and edits every draft before anything is sent. Your job is to save them time while keeping the reply human and in their voice.

Style rules:
${styleRulesText(style)}

Return only JSON with this shape:
{"soft": "...", "mid": "...", "firm": "...", "talkingPoints": ["...", "...", "..."]}
- soft: warm and easy, encouraging.
- mid: straight to the point, friendly.
- firm: clear and direct, holds the client accountable.
- talkingPoints: 2 to 4 very short points (under 8 words each) the coach can glance at while recording a voice note.
All three replies must give the same advice. Only the tone changes.`;

  const lines = ctx.thread.map(
    (m) => `${m.direction === "in" ? contact.name.split(" ")[0] : "Coach"} (${CHANNELS[m.channel].label}, ${m.at.slice(0, 10)}): ${m.text}`
  );
  const user = `Client: ${contact.name}
Goals: ${contact.goals.map((g) => g.title + (g.target ? ` (${g.target})` : "")).join("; ") || "none recorded"}
Open promises from the coach: ${ctx.promises.map((p) => p.text).join("; ") || "none"}
Stats they've reported: ${statsForPrompt(contact.stats) || "none yet"}
${contact.nextSession ? `Next session: ${contact.nextSession.when}, ${contact.nextSession.topic}` : ""}

How this coach actually texts (match this voice):
${ctx.coachSamples.map((s) => "- " + s).join("\n") || "- (no samples yet, keep it short and casual)"}

Recent conversation:
${lines.join("\n")}

${mode === "nudge"
    ? `${contact.name.split(" ")[0]} hasn't replied ${quietDays >= 2 ? `for ${quietDays} days` : "since your last message"}. Write a short, friendly check-in on ${CHANNELS[msg.channel].label} that makes it easy to reply. Mention their goal if it helps. No guilt trips.`
    : `Reply to this latest message from ${contact.name.split(" ")[0]} on ${CHANNELS[msg.channel].label}:\n"${msg.text}"`}`;

  try {
    const raw = await ask(system, user);
    const parsed = parseJSON<{ soft: string; mid: string; firm: string; talkingPoints?: string[] }>(raw);
    if (!parsed?.soft || !parsed.mid || !parsed.firm) throw new Error("Bad draft format");
    return {
      soft: enforceStyle(parsed.soft, style, db.settings.coachName),
      mid: enforceStyle(parsed.mid, style, db.settings.coachName),
      firm: enforceStyle(parsed.firm, style, db.settings.coachName),
      talkingPoints: (parsed.talkingPoints || []).slice(0, 4).map((t) => enforceStyle(t, style)),
      basedOn: ctx.basedOn,
      source: "ai",
    };
  } catch (err) {
    console.error("[drafts] AI failed, using demo drafts:", err);
    return mode === "nudge" ? demoNudge(contact, ctx.basedOn, db, quietDays) : demoDrafts(msg, contact, ctx.basedOn, db);
  }
}

/** Hand-written drafts for the demo data, plus a generic fallback. */
function demoDrafts(msg: Message, contact: Contact, basedOn: string[], db: DB): Drafts {
  const first = contact.name.split(" ")[0];
  const known: Record<string, Omit<Drafts, "basedOn" | "source">> = {
    m3: {
      soft: "No stress, heavy legs happen. Don't make it up. Easy 5k Thursday instead of the tempo and we'll do the long run Sunday. How's sleep been?",
      mid: "Don't make it up this week. Swap Thursday's tempo for an easy 5k, long run Sunday like planned. How's sleep been?",
      firm: "Skip the make up run. Easy 5k Thursday, long run Sunday. And send me your sleep hours this week, I think that's the real issue.",
      talkingPoints: ["Don't make up Sunday's run", "Easy 5k Thursday instead of tempo", "Long run Sunday, ask about sleep"],
    },
    m4: {
      soft: "Let's gooo, so proud of you! Monday works. 6pm? Bring the job description and we'll run the case question together",
      mid: "Huge. Monday at 6 works. Bring the job description and we'll practice the case question",
      firm: "Big one. Monday 6pm. Come with the job description and 2 stories ready, we're drilling the case question",
      talkingPoints: ["Congrats on round two", "Monday 6pm works", "Bring the job description"],
    },
    m5: {
      soft: "Of course! Here it is again. Just try the first 3 steps this week, no pressure",
      mid: "Here you go. Try just the first 3 steps this week and tell me Friday which one stuck",
      firm: "Here it is. First 3 steps, every day this week. Check in Friday with which one stuck",
      talkingPoints: ["Template attached", "Just the first 3 steps", "Check in Friday"],
    },
    m6: {
      soft: "10 in a row!! That's huge man, proud of you",
      mid: "10 in a row, the habit is forming. Let's add one mobility day next week so you stay fresh",
      firm: "10 straight, love it. Next week we add a mobility day. Non negotiable, your hips will thank you",
      talkingPoints: ["10 in a row, huge", "Add a mobility day next week"],
    },
  };
  const base = known[msg.id] ?? {
    soft: `Thanks for the update ${first}, really appreciate you keeping me in the loop. Let me think on it and I'll get back to you today`,
    mid: `Got it ${first}. Let me look at this and get back to you today`,
    firm: `Thanks ${first}. I'll get back to you today with next steps, keep doing what we planned until then`,
    talkingPoints: ["Thanks for the update", "Back to you today"],
  };
  const s = db.settings.style;
  return {
    soft: enforceStyle(base.soft, s),
    mid: enforceStyle(base.mid, s),
    firm: enforceStyle(base.firm, s),
    talkingPoints: base.talkingPoints,
    basedOn,
    source: "demo",
  };
}

function demoNudge(contact: Contact, basedOn: string[], db: DB, days: number): Drafts {
  const first = contact.name.split(" ")[0];
  const goal = contact.goals[0]?.title.toLowerCase();
  const s = db.settings.style;
  return {
    soft: enforceStyle(`Hey ${first}, haven't heard from you in a bit. No pressure at all, how's the week going?`, s),
    mid: enforceStyle(`Hey ${first}, checking in. How's everything going${goal ? ` with ${goal}` : ""}?`, s),
    firm: enforceStyle(days >= 2 ? `${first}, it's been ${days} days. Send me a quick update today so we can keep things moving` : `${first}, send me a quick update today so we can keep things moving`, s),
    talkingPoints: ["Haven't heard from you", "How's the week going", goal ? `Ask about ${goal}` : "Offer a quick call"],
    basedOn,
    source: "demo",
  };
}

/* ------------------------------------------------------------------ */
/* Screenshot → messages                                               */
/* ------------------------------------------------------------------ */

export interface ExtractedChat {
  personName?: string;
  messages: { from: "client" | "coach"; text: string }[];
}

export async function extractFromScreenshot(base64: string, mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"): Promise<ExtractedChat> {
  if (!aiEnabled()) {
    throw new Error("Reading screenshots needs an ANTHROPIC_API_KEY. Paste the text instead.");
  }
  const system = `You read screenshots of chat conversations for a coach. The coach's own messages are usually on the right side. Return only JSON:
{"personName": "name shown at the top of the chat, if visible", "messages": [{"from": "client" | "coach", "text": "..."}]}
Keep messages in order, oldest first. Copy text exactly. Skip timestamps, reactions and system notices.`;
  const raw = await ask(
    system,
    [
      { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
      { type: "text", text: "Extract the conversation from this screenshot." },
    ],
    1500
  );
  const parsed = parseJSON<ExtractedChat>(raw);
  if (!parsed || !Array.isArray(parsed.messages)) throw new Error("Couldn't read that screenshot. Try a clearer one or paste the text.");
  return parsed;
}

/* ------------------------------------------------------------------ */
/* Wins: quotable lines and repeated questions for content             */
/* ------------------------------------------------------------------ */

export async function scanWins(db: DB): Promise<Win[]> {
  const recent = db.messages
    .filter((m) => m.direction === "in")
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 80);
  const known = new Set(db.wins.map((w) => w.sourceMessageId).filter(Boolean));
  const now = new Date().toISOString();

  if (!aiEnabled()) {
    const winRe = /\b(first|in a row|hit|pr\b|personal best|down \d+|signed up|registered|finally|proud|crushed|nailed)\b/i;
    const quotes = recent.filter((m) => !known.has(m.id) && winRe.test(m.text)).slice(0, 5);
    const questions = groupQuestions(recent);
    const existingQ = new Set(db.wins.filter((w) => w.type === "question").map((w) => w.text.toLowerCase()));
    return [
      ...quotes.map<Win>((m) => ({ id: uid("w_"), type: "quote", clientId: m.clientId, text: m.text, permission: "none", createdAt: now, sourceMessageId: m.id })),
      ...questions
        .filter((q) => !existingQ.has(q.text.toLowerCase()))
        .map<Win>((q) => ({ id: uid("w_"), type: "question", text: q.text, count: q.count, note: `Asked ${q.count} times recently. Your answer is a ready-made post.`, permission: "yes", createdAt: now })),
    ];
  }

  const names = new Map(db.contacts.map((c) => [c.id, c.name]));
  const list = recent.map((m) => `[${m.id}] ${names.get(m.clientId) ?? "Client"}: ${m.text}`).join("\n");
  const system = `You help a coach turn client conversations into social media content. From the messages, find:
1. "quotes": client wins worth celebrating publicly (progress, milestones, breakthroughs). Use the exact message text.
2. "questions": questions several clients ask, written as one clean question, with how many messages ask it.
Return only JSON: {"quotes": [{"messageId": "...", "text": "..."}], "questions": [{"text": "...", "count": 2}]}
Skip anything private, medical or embarrassing. At most 5 quotes and 3 questions.`;
  try {
    const raw = await ask(system, list, 1200);
    const parsed = parseJSON<{ quotes?: { messageId: string; text: string }[]; questions?: { text: string; count: number }[] }>(raw);
    const byId = new Map(db.messages.map((m) => [m.id, m]));
    const existingQ = new Set(db.wins.filter((w) => w.type === "question").map((w) => w.text.toLowerCase()));
    return [
      ...(parsed?.quotes ?? [])
        .filter((q) => byId.has(q.messageId) && !known.has(q.messageId))
        .map<Win>((q) => ({ id: uid("w_"), type: "quote", clientId: byId.get(q.messageId)!.clientId, text: byId.get(q.messageId)!.text, permission: "none", createdAt: now, sourceMessageId: q.messageId })),
      ...(parsed?.questions ?? [])
        .filter((q) => q.count >= 2 && !existingQ.has(q.text.toLowerCase()))
        .map<Win>((q) => ({ id: uid("w_"), type: "question", text: q.text, count: q.count, note: `Asked ${q.count} times recently. Your answer is a ready-made post.`, permission: "yes", createdAt: now })),
    ];
  } catch (err) {
    console.error("[wins] AI scan failed:", err);
    return [];
  }
}

function groupQuestions(msgs: Message[]): { text: string; count: number }[] {
  const groups = new Map<string, { text: string; count: number }>();
  for (const m of msgs) {
    if (!m.text.includes("?")) continue;
    const key = m.text
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !["quick", "should", "could", "would", "just"].includes(w))
      .slice(0, 4)
      .join(" ");
    if (!key) continue;
    const g = groups.get(key) ?? { text: m.text.split("?")[0].replace(/^quick one,?\s*/i, "") + "?", count: 0 };
    g.count += 1;
    groups.set(key, g);
  }
  return [...groups.values()].filter((g) => g.count >= 2);
}
