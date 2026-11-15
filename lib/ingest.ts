import "server-only";
import type { Channel, Contact, DB } from "./types";
import { admit } from "./privacy";
import { uid } from "./util";

export interface Incoming {
  channel: Channel;
  /** Phone number, username, platform user id or email: whatever identifies the sender. */
  handle: string;
  name?: string;
  text: string;
  at?: string | number | Date;
  /** The platform's own message id, so webhook retries don't create duplicates. */
  externalId?: string;
  /** A test message from the Channels screen. */
  demo?: boolean;
}

export type IngestResult =
  | { stored: true; messageId: string; client: Contact }
  | { stored: false; reason: "not_a_client" | "unknown_sender" | "duplicate" };

/**
 * One way in for every channel. The privacy gate runs first: only clients the
 * coach picked are stored. Unknown senders leave just a name and handle so the
 * coach can add them; the message text is never kept.
 */
export function ingest(db: DB, m: Incoming): IngestResult {
  if (m.externalId && db.messages.some((x) => x.externalId === m.externalId)) {
    return { stored: false, reason: "duplicate" };
  }
  const gate = admit(db, m.channel, m.handle, m.name);
  if (!gate.admitted) return { stored: false, reason: gate.reason };

  // Their newest message is the one to answer; older unanswered ones become context.
  db.messages
    .filter((x) => x.clientId === gate.client.id && x.status === "needs_reply")
    .forEach((x) => (x.status = "info"));

  const id = uid("in_");
  db.messages.push({
    id,
    clientId: gate.client.id,
    channel: m.channel,
    direction: "in",
    text: m.text.trim() || "[attachment]",
    at: new Date(m.at ?? Date.now()).toISOString(),
    status: "needs_reply",
    ...(m.externalId ? { externalId: m.externalId } : {}),
    ...(m.demo ? { demo: true } : {}),
  });
  return { stored: true, messageId: id, client: gate.client };
}

/** Remember an extra handle for a client, e.g. the numeric id a platform needs for replies. */
export function addHandle(contact: Contact, channel: Channel, value: string) {
  if (!contact.handles.some((h) => h.channel === channel && h.value === value)) {
    contact.handles.push({ channel, value });
  }
}
