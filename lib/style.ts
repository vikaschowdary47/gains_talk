import type { StyleSettings } from "./types";

/**
 * Last pass over every draft so it reads like a text from a real coach.
 * Daniel's feedback: no em dashes, natural beats articulate.
 */
export function enforceStyle(text: string, style: StyleSettings, coachName?: string): string {
  let t = text.trim();
  // Strip wrapping quotes the model sometimes adds.
  t = t.replace(/^["'“‘]+|["'”’]+$/g, "").trim();
  if (style.noEmDashes) {
    // "word — word" or "word—word" becomes "word, word"
    t = t.replace(/\s*[—–]\s*/g, ", ").replace(/\s--\s/g, ", ");
    t = t.replace(/,\s*,/g, ",");
  }
  if (!style.signOff) {
    const lines = t.split("\n");
    const last = lines[lines.length - 1]?.trim() ?? "";
    const signoff = /^(-|–)?\s*(coach\s+)?[A-Z][a-z]+\.?$/;
    if (lines.length > 1 && (signoff.test(last) || (coachName && last.toLowerCase().includes(coachName.toLowerCase()) && last.length < 30))) {
      lines.pop();
      t = lines.join("\n").trim();
    }
  }
  return t.replace(/[ \t]{2,}/g, " ");
}

export function styleRulesText(style: StyleSettings): string {
  const rules = [
    "Write like a real coach texting a client from their phone.",
    "Short: one to three sentences.",
    style.noEmDashes ? "Never use em dashes or en dashes. Use commas or periods instead." : "",
    style.casual ? "Casual and natural, not polished or corporate. Contractions are good. Lowercase starts are fine if the coach texts that way." : "Friendly and clear.",
    style.matchEmoji ? "Only use emoji if the coach's own messages use them, and sparingly." : "No emoji.",
    style.signOff ? "End with the coach's usual sign-off." : "No sign-off or signature.",
    "Never mention that you are an AI. Never invent facts, plans or numbers that aren't in the context.",
  ];
  return rules.filter(Boolean).map((r) => "- " + r).join("\n");
}
