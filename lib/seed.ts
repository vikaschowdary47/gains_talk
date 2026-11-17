import type { DB } from "./types";

/** A fresh, empty start: real clients arrive from connected channels. */
export function seedDB(): DB {
  return {
    version: 1,
    settings: {
      onboarded: false,
      coachName: process.env.COACH_NAME || "Coach",
      apps: ["whatsapp", "instagram", "texts", "trainerize"],
      style: {
        noEmDashes: true,
        casual: true,
        matchEmoji: true,
        signOff: false,
        defaultAngle: "mid",
        samples: [],
      },
      forwardingLocalPart: "coach",
      ignoredCount: 0,
      samplesCleared: true,
    },
    contacts: [],
    messages: [],
    promises: [],
    wins: [],
    pending: [],
  };
}

/** The made-up clients that used to come with the app. Their numbers and usernames
 *  aren't real, so replies to them are marked as sent instead of sent. */
const SAMPLE_IDS = new Set(["maya", "jordan", "priya", "owen", "chris", "elena", "sofia", "mom", "sam"]);
const SAMPLE_MESSAGE = /^m\d+$/;
const SAMPLE_EXTRAS = new Set(["p1", "w1", "w2", "w3"]);
export function isSampleContact(c: { id: string; demo?: boolean }): boolean {
  return SAMPLE_IDS.has(c.id) || Boolean(c.demo);
}

/**
 * One-time cleanup of the demo data older databases started with.
 * Real messages (anything that came from a platform or was really sent) are kept,
 * and a sample client that received real messages becomes a plain real client.
 * Returns true if anything changed.
 */
export function clearSampleData(db: DB): boolean {
  if (db.settings.samplesCleared) return false;
  const fake = (m: DB["messages"][number]) =>
    m.demo ||
    m.sentVia === "demo" ||
    (SAMPLE_MESSAGE.test(m.id) && !m.externalId) ||
    (SAMPLE_IDS.has(m.clientId) && !m.externalId && m.sentVia !== "api");
  db.messages = db.messages.filter((m) => !fake(m));
  const withMessages = new Set(db.messages.map((m) => m.clientId));
  db.contacts = db.contacts.filter((c) => !SAMPLE_IDS.has(c.id) || withMessages.has(c.id));
  for (const c of db.contacts) {
    if (!SAMPLE_IDS.has(c.id)) continue;
    // Keep the person and their real handles, drop the made-up profile.
    c.handles = c.handles.filter((h) => !/555\d{4}$|example\.com$/.test(h.value));
    c.goals = [];
    delete c.hint;
    delete c.nextSession;
  }
  const ids = new Set(db.contacts.map((c) => c.id));
  const msgIds = new Set(db.messages.map((m) => m.id));
  db.promises = db.promises.filter((x) => !SAMPLE_EXTRAS.has(x.id) && ids.has(x.clientId) && (!x.sourceMessageId || msgIds.has(x.sourceMessageId)));
  db.wins = db.wins.filter((w) => !SAMPLE_EXTRAS.has(w.id) && (!w.clientId || ids.has(w.clientId)) && (!w.sourceMessageId || msgIds.has(w.sourceMessageId)));
  db.pending = db.pending.filter((x) => !/^\d{1,6}$/.test(x.handle.value)); // Meta's dashboard test sender ("12334")
  if (db.settings.coachName === "Alex") db.settings.coachName = process.env.COACH_NAME || "Coach";
  db.settings.ignoredCount = 0;
  db.settings.samplesCleared = true;
  return true;
}

/** One-time cleanup: replies saved twice (sent from GainsTalk, then echoed back by Instagram). */
export function removeDuplicateReplies(db: DB): boolean {
  if (db.settings.dedupedReplies) return false;
  const kept: DB["messages"] = [];
  const sorted = [...db.messages].sort((a, b) => a.at.localeCompare(b.at));
  for (const m of sorted) {
    const dup = m.direction === "out" && kept.some(
      (k) => k.clientId === m.clientId && k.direction === "out" && k.text.trim() === m.text.trim() && Math.abs(Date.parse(k.at) - Date.parse(m.at)) < 10 * 60_000,
    );
    if (!dup) kept.push(m);
  }
  db.messages = kept;
  db.settings.dedupedReplies = true;
  return true;
}
