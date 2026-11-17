import "server-only";
import { updateDB } from "./store";

export interface AiStatus {
  ok: boolean;
  at: string;
  /** Plain-English reason, shown to the coach. */
  detail: string;
}

/** Turn an Anthropic error into one plain sentence with the fix. */
export function explainAiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/credit balance is too low/i.test(raw))
    return "Your Anthropic account is out of credit, so drafts use simple templates. Add credit at console.anthropic.com under Plans & Billing. A Claude Pro subscription doesn't include API credit.";
  if (/invalid x-api-key|authentication_error|401/i.test(raw))
    return "Anthropic didn't accept the API key. Make a new key at console.anthropic.com, put it in ANTHROPIC_API_KEY in Vercel and redeploy.";
  if (/not_found_error|model/i.test(raw) && /404|not found/i.test(raw))
    return "The Claude model name isn't available to this key. Remove ANTHROPIC_MODEL in Vercel to use the default.";
  if (/rate_limit|429/i.test(raw)) return "Claude is rate-limiting this key right now. Drafts will work again in a minute.";
  if (/overloaded|529|5\d\d/i.test(raw)) return "Claude is busy right now. Drafts will work again shortly.";
  return `Claude returned an error: ${raw.slice(0, 200)}`;
}

let last: { ok: boolean; detail: string; at: number } | null = null;

/** Remember whether the last Claude call worked. Writes only when the state changes (or every 10 minutes). */
export async function recordAiStatus(ok: boolean, detail = ""): Promise<void> {
  const now = Date.now();
  if (last && last.ok === ok && last.detail === detail && now - last.at < 10 * 60_000) return;
  last = { ok, detail, at: now };
  try {
    await updateDB((db) => {
      db.settings.aiStatus = { ok, at: new Date(now).toISOString(), detail: ok ? "Claude is writing your drafts." : detail };
    });
  } catch {
    /* status is best-effort */
  }
}
