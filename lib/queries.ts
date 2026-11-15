import type { Contact, DB, Message } from "./types";
import { daysAgo, timeLabel } from "./util";
import { CHANNELS } from "./channels";

export const QUIET_AFTER_DAYS = 7;

export function clientsOf(db: DB): Contact[] {
  return db.contacts.filter((c) => c.isClient);
}

export function lastInbound(db: DB, clientId: string): Message | undefined {
  return db.messages
    .filter((m) => m.clientId === clientId && m.direction === "in")
    .sort((a, b) => b.at.localeCompare(a.at))[0];
}

export function needsReply(db: DB): Message[] {
  const ids = new Set(clientsOf(db).map((c) => c.id));
  return db.messages
    .filter((m) => m.status === "needs_reply" && ids.has(m.clientId))
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function quietClients(db: DB): { contact: Contact; days: number }[] {
  const waiting = new Set(needsReply(db).map((m) => m.clientId));
  return clientsOf(db)
    .map((c) => ({ contact: c, last: lastInbound(db, c.id) }))
    .filter((x) => x.last && !waiting.has(x.contact.id) && daysAgo(x.last.at) >= QUIET_AFTER_DAYS)
    .map((x) => ({ contact: x.contact, days: daysAgo(x.last!.at) }))
    .sort((a, b) => b.days - a.days);
}

export type ClientStatus = "replies" | "quiet" | "track";

export interface ClientRow {
  id: string;
  name: string;
  initials: string;
  avatar: string;
  status: ClientStatus;
  statusLabel: string;
  when: string;
  channel: string;
  channelKey: keyof typeof CHANNELS;
}

export function clientRows(db: DB): ClientRow[] {
  const waiting = new Set(needsReply(db).map((m) => m.clientId));
  const quiet = new Map(quietClients(db).map((q) => [q.contact.id, q.days]));
  return clientsOf(db).map((c) => {
    const last = db.messages.filter((m) => m.clientId === c.id).sort((a, b) => b.at.localeCompare(a.at))[0];
    const status: ClientStatus = waiting.has(c.id) ? "replies" : quiet.has(c.id) ? "quiet" : "track";
    const channelKey = (last?.channel ?? c.handles[0]?.channel ?? "texts") as keyof typeof CHANNELS;
    return {
      id: c.id,
      name: c.name,
      initials: c.initials,
      avatar: c.avatar,
      status,
      statusLabel: status === "replies" ? "Reply ready" : status === "quiet" ? `${quiet.get(c.id)} days quiet` : c.nextSession ? `Session ${c.nextSession.when.split(" ")[0]}` : "On track",
      when: last ? timeLabel(last.at) : "",
      channel: CHANNELS[channelKey].label,
      channelKey,
    };
  });
}
