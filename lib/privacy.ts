import type { Channel, Contact, DB } from "./types";
import { uid } from "./util";

function norm(channel: Channel, value: string): string {
  const v = value.trim().toLowerCase();
  if (channel === "whatsapp" || channel === "texts") return v.replace(/\D/g, "");
  if (channel === "instagram" || channel === "tiktok") return v.replace(/^@/, "");
  return v;
}

/** Same handle? Phone numbers also match with or without the country code
 *  ("(312) 555-0123" and "+1 312 555 0123"). */
function sameHandle(channel: Channel, a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (channel !== "whatsapp" && channel !== "texts") return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 9 && long.length - short.length <= 3 && long.endsWith(short);
}

/** Find a contact (client or not) by a channel handle. */
export function findByHandle(db: DB, channel: Channel, value: string): Contact | undefined {
  const target = norm(channel, value);
  if (!target) return undefined;
  return db.contacts.find((c) => c.handles.some((h) => h.channel === channel && sameHandle(channel, norm(channel, h.value), target)));
}

export type AdmitResult =
  | { admitted: true; client: Contact }
  | { admitted: false; reason: "not_a_client" | "unknown_sender" };

/**
 * The privacy gate. Every incoming message passes through here BEFORE anything
 * is stored. Only people the coach marked as clients get through.
 *
 * - Known non-client (friends, family): dropped. Only a counter goes up.
 * - Unknown sender: dropped. We keep their name and handle (no message text)
 *   so the coach can add them as a client later if they want.
 */
export function admit(db: DB, channel: Channel, handle: string, displayName?: string): AdmitResult {
  const contact = findByHandle(db, channel, handle);
  if (contact?.isClient) return { admitted: true, client: contact };

  db.settings.ignoredCount += 1;
  if (!contact) {
    const exists = db.pending.some((p) => p.handle.channel === channel && sameHandle(channel, norm(channel, p.handle.value), norm(channel, handle)));
    if (!exists) {
      db.pending.push({
        id: uid("pc_"),
        name: displayName?.trim() || handle,
        handle: { channel, value: handle },
        firstSeen: new Date().toISOString(),
      });
    }
    return { admitted: false, reason: "unknown_sender" };
  }
  return { admitted: false, reason: "not_a_client" };
}
