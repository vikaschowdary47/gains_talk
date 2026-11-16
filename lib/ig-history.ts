import "server-only";
import type { DB } from "./types";
import { igApi, igToken } from "./instagram";
import { uid } from "./util";

export interface IgPast {
  id: string;
  text: string;
  fromThem: boolean;
  at: string;
}

const isNumericId = (v: string) => /^\d{6,}$/.test(v);

/**
 * Recent Instagram messages between the coach and one person, newest last.
 * Only called after the coach marks the person as a client, so nothing is read before that.
 */
export async function fetchIgHistory(db: DB, igsid: string, limit = 30): Promise<IgPast[]> {
  const token = igToken(db);
  if (!token || !isNumericId(igsid)) return [];
  const { base, account } = igApi(db);
  const fields = `messages.limit(${limit}){id,message,from,created_time,attachments}`;
  const urls = [
    `${base}/${account}/conversations?platform=instagram&user_id=${igsid}&fields=${encodeURIComponent(fields)}`,
    `${base}/${account}/conversations?user_id=${igsid}&fields=${encodeURIComponent(fields)}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        data?: { messages?: { data?: { id: string; message?: string; from?: { id?: string }; created_time?: string; attachments?: unknown }[] } }[];
      };
      if (!res.ok || json.error) continue;
      const list = json.data?.[0]?.messages?.data ?? [];
      return list
        .filter((m) => m.id && m.created_time)
        .map((m) => ({
          id: m.id,
          text: (m.message ?? "").trim() || (m.attachments ? "[attachment]" : ""),
          fromThem: m.from?.id === igsid,
          at: new Date(m.created_time!.replace(/\+0000$/, "Z")).toISOString(),
        }))
        .filter((m) => m.text)
        .sort((a, b) => a.at.localeCompare(b.at));
    } catch {
      /* try the next form */
    }
  }
  return [];
}

/**
 * Add past messages to a client's timeline, skipping ones already saved.
 * If their newest message came after the coach's last reply, it becomes the one to answer.
 */
export function mergeIgHistory(db: DB, clientId: string, past: IgPast[]): number {
  const known = new Set(db.messages.map((m) => m.externalId).filter(Boolean));
  let added = 0;
  for (const p of past) {
    if (known.has(p.id)) continue;
    db.messages.push({
      id: uid(p.fromThem ? "in_" : "out_"),
      clientId,
      channel: "instagram",
      direction: p.fromThem ? "in" : "out",
      text: p.text,
      at: p.at,
      status: p.fromThem ? "info" : "replied",
      externalId: p.id,
    });
    added++;
  }
  if (added) {
    const mine = db.messages.filter((m) => m.clientId === clientId).sort((a, b) => a.at.localeCompare(b.at));
    const last = mine[mine.length - 1];
    if (last?.direction === "in" && !mine.some((m) => m.status === "needs_reply")) last.status = "needs_reply";
  }
  return added;
}

/** Instagram ids for a contact that the history lookup can use. */
export function igIdsOf(handles: { channel: string; value: string }[]): string[] {
  return handles.filter((h) => h.channel === "instagram" && isNumericId(h.value)).map((h) => h.value);
}
