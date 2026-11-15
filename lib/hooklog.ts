import "server-only";
import type { Channel, DB, HookEvent } from "./types";
import type { IngestResult } from "./ingest";
import { updateDB } from "./store";

/** Remember what happened to the latest webhook calls (never the message text),
 *  so the Channels screen can say whether Meta is reaching GainsTalk. */
export function logHook(db: DB, channel: Channel, ok: boolean, result: string): void {
  db.webhookLog = [{ at: new Date().toISOString(), channel, ok, result }, ...(db.webhookLog ?? [])].slice(0, 20);
}

export async function recordHook(channel: Channel, ok: boolean, result: string): Promise<void> {
  try {
    await updateDB((db) => logHook(db, channel, ok, result));
  } catch (e) {
    console.error("[hooklog]", e);
  }
}

/** One plain line for a batch of incoming messages. */
export function describe(results: IngestResult[], extraSaved = 0): string {
  const saved = results.filter((r) => r.stored).length + extraSaved;
  const pending = results.filter((r) => !r.stored && r.reason === "unknown_sender").length;
  const dropped = results.filter((r) => !r.stored && r.reason === "not_a_client").length;
  const repeats = results.filter((r) => !r.stored && r.reason === "duplicate").length;
  const parts: string[] = [];
  if (saved) parts.push(saved === 1 ? "Client message saved" : `${saved} client messages saved`);
  if (pending) parts.push(pending === 1 ? "New person waiting on Today" : `${pending} new people waiting on Today`);
  if (dropped) parts.push("Not a client, dropped");
  if (repeats) parts.push("Repeat, ignored");
  return parts.join(". ") || "Received, nothing to save";
}

export const SIGNATURE_HELP = "Rejected: the signature didn't match. META_APP_SECRET in Vercel must be your Meta app's App secret.";

/** Log Meta's verification handshake, then answer it. */
export async function loggedChallenge(channel: Channel, res: Response): Promise<Response> {
  await recordHook(channel, res.status === 200, res.status === 200 ? "Meta checked the webhook address. All good." : "Meta's check failed: the verify token didn't match.");
  return res;
}

export type { HookEvent };
