import "server-only";
import type { DB } from "./types";
import { igApi, igToken } from "./instagram";
import { uid } from "./util";

/** Instagram only lets apps read the 20 most recent messages of each chat. */
export const IG_HISTORY_LIMIT = 20;

export interface IgPast {
  id: string;
  text: string;
  fromThem: boolean;
  at: string;
}

export interface IgPerson {
  /** Instagram-scoped id (what webhooks and replies use). */
  igsid: string;
  username?: string;
  name?: string;
  lastAt?: string;
}

const isNumericId = (v: string) => /^\d{6,}$/.test(v);

type Json = Record<string, unknown> & { error?: { message?: string }; paging?: { next?: string } };

async function get(url: string, token: string): Promise<{ ok: boolean; json: Json; error: string }> {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as Json;
    return { ok: res.ok && !json.error, json, error: json.error?.message || (res.ok ? "" : `HTTP ${res.status}`) };
  } catch (e) {
    return { ok: false, json: {}, error: e instanceof Error ? e.message : String(e) };
  }
}

/** The places Meta may answer "conversations" for this token, most likely first. */
function conversationBases(db: DB): string[] {
  const { base, account } = igApi(db);
  const list = [`${base}/${account}/conversations`];
  if (account !== "me") list.push(`${base}/me/conversations`);
  return list;
}

const toIso = (t?: string) => (t ? new Date(t.replace(/\+0000$/, "Z")).toISOString() : undefined);

/**
 * Everyone the coach has chatted with recently on Instagram: names and dates only, no message text.
 * This is what the coach picks clients from.
 */
export async function listIgPeople(db: DB, maxPages = 6): Promise<{ people: IgPerson[]; error?: string }> {
  const token = igToken(db);
  if (!token) return { people: [], error: "Instagram isn't connected yet." };
  const { base, account } = igApi(db);
  const me = await get(`${base}/${account}?fields=id,username`, token);
  const ownIds = new Set([account, String(me.json.id ?? "")].filter(Boolean));
  const ownName = String(me.json.username ?? "").toLowerCase();

  const errors: string[] = [];
  for (const root of conversationBases(db)) {
    let url: string | undefined = `${root}?platform=instagram&fields=${encodeURIComponent("participants,updated_time")}&limit=50`;
    const people = new Map<string, IgPerson>();
    let pages = 0;
    let failed = false;
    while (url && pages < maxPages) {
      const r = await get(url, token);
      if (!r.ok) {
        failed = pages === 0;
        if (failed) errors.push(r.error);
        break;
      }
      const data = (r.json.data as { updated_time?: string; participants?: { data?: { id: string; username?: string; name?: string }[] } }[] | undefined) ?? [];
      for (const conv of data) {
        for (const p of conv.participants?.data ?? []) {
          if (ownIds.has(p.id) || (p.username && p.username.toLowerCase() === ownName)) continue;
          if (!people.has(p.id)) people.set(p.id, { igsid: p.id, username: p.username, name: p.name, lastAt: toIso(conv.updated_time) });
        }
      }
      url = r.json.paging?.next;
      pages++;
    }
    if (!failed) return { people: [...people.values()].sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? "")) };
  }
  return { people: [], error: `Instagram didn't share your chat list: ${errors[errors.length - 1] ?? "no answer"}` };
}

type RawMsg = { id: string; message?: string; from?: { id?: string }; created_time?: string; attachments?: unknown };

function toPast(list: RawMsg[], igsid: string): IgPast[] {
  return list
    .filter((m) => m.id && m.created_time)
    .map((m) => ({
      id: m.id,
      text: (m.message ?? "").trim() || (m.attachments ? "[photo or file]" : ""),
      fromThem: m.from?.id === igsid,
      at: toIso(m.created_time)!,
    }))
    .filter((m) => m.text)
    .sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * The most recent messages (up to 20, Instagram's limit) between the coach and one person.
 * Only called after the coach marks the person as a client, so nothing is read before that.
 */
export async function fetchIgHistory(db: DB, igsid: string): Promise<{ messages: IgPast[]; error?: string }> {
  const token = igToken(db);
  if (!token) return { messages: [], error: "Instagram isn't connected." };
  if (!isNumericId(igsid)) return { messages: [], error: "No Instagram id saved for this person yet." };
  const fields = `messages.limit(${IG_HISTORY_LIMIT}){id,message,from,created_time,attachments}`;
  const errors: string[] = [];
  for (const root of conversationBases(db)) {
    const r = await get(`${root}?platform=instagram&user_id=${igsid}&fields=${encodeURIComponent(fields)}`, token);
    if (!r.ok) {
      errors.push(r.error);
      continue;
    }
    const conv = (r.json.data as { id?: string; messages?: { data?: RawMsg[] } }[] | undefined)?.[0];
    if (!conv) return { messages: [] };
    if (conv.messages?.data?.length) return { messages: toPast(conv.messages.data, igsid) };
    // Some setups only return ids here: ask the conversation directly.
    if (conv.id) {
      const { base } = igApi(db);
      const c = await get(`${base}/${conv.id}?fields=${encodeURIComponent(fields)}`, token);
      const list = (c.json.messages as { data?: RawMsg[] } | undefined)?.data ?? [];
      if (c.ok) return { messages: toPast(list, igsid) };
      errors.push(c.error);
    }
  }
  return { messages: [], error: `Instagram didn't share past messages: ${errors[errors.length - 1] ?? "no answer"}` };
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
