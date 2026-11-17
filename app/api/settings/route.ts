import { after } from "next/server";
import { logPendingStats } from "@/lib/stats";
import { addHandle } from "@/lib/ingest";
import { readDB, updateDB } from "@/lib/store";
import { fetchIgHistory, igIdsOf, mergeIgHistory } from "@/lib/ig-history";
import { recordHook } from "@/lib/hooklog";
import { isChannel } from "@/lib/channels";
import { avatarFor, initialsOf, uid } from "@/lib/util";
import type { Angle, Channel, StyleSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Onboarding + settings: apps, who counts as a client, texting style. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    apps?: string[];
    clients?: Record<string, boolean>;
    addPending?: string;
    dismissPending?: string;
    /** The new account belongs to an existing client: attach the handle to them. */
    linkPending?: { id: string; clientId: string };
    /** Remove a client and delete their messages, promises and wins. */
    deleteClient?: string;
    newClient?: { name: string; channel: string; handle: string };
    style?: Partial<StyleSettings>;
    onboarded?: boolean;
    timeZone?: string;
  };

  // People who just became clients: pull their recent Instagram messages afterwards.
  const becameClients: string[] = [];

  const settings = await updateDB((db) => {
    if (body.apps) db.settings.apps = body.apps.filter(isChannel);

    if (body.clients) {
      for (const c of db.contacts) {
        if (c.id in body.clients) {
          const now = Boolean(body.clients[c.id]);
          if (now && !c.isClient) becameClients.push(c.id);
          c.isClient = now;
          if (now && !c.since) c.since = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
        }
      }
    }

    if (body.addPending) {
      const p = db.pending.find((x) => x.id === body.addPending);
      if (p) {
        const id = uid("c_");
        db.contacts.push({
          id, name: p.name, initials: initialsOf(p.name), avatar: avatarFor(p.name),
          handles: [p.handle], isClient: true, goals: [], since: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        });
        db.pending = db.pending.filter((x) => x.id !== p.id);
        becameClients.push(id);
      }
    }

    if (body.deleteClient) {
      const cid = body.deleteClient;
      db.contacts = db.contacts.filter((c) => c.id !== cid);
      db.messages = db.messages.filter((m) => m.clientId !== cid);
      db.promises = db.promises.filter((p) => p.clientId !== cid);
      db.wins = db.wins.filter((w) => w.clientId !== cid);
    }

    if (body.linkPending) {
      const p = db.pending.find((x) => x.id === body.linkPending!.id);
      const client = db.contacts.find((c) => c.id === body.linkPending!.clientId && c.isClient);
      if (p && client) {
        addHandle(client, p.handle.channel, p.handle.value);
        db.pending = db.pending.filter((x) => x.id !== p.id);
        becameClients.push(client.id);
      }
    }

    if (body.dismissPending) {
      // Not a client: remember them so future messages are dropped quietly.
      const p = db.pending.find((x) => x.id === body.dismissPending);
      if (p) {
        db.contacts.push({
          id: uid("c_"), name: p.name, initials: initialsOf(p.name), avatar: avatarFor(p.name),
          handles: [p.handle], isClient: false, goals: [],
        });
        db.pending = db.pending.filter((x) => x.id !== p.id);
      }
    }

    if (body.newClient?.name && isChannel(body.newClient.channel)) {
      const n = body.newClient;
      db.contacts.push({
        id: uid("c_"), name: n.name.trim(), initials: initialsOf(n.name), avatar: avatarFor(n.name),
        handles: n.handle ? [{ channel: n.channel as Channel, value: n.handle.trim() }] : [],
        isClient: true, goals: [], since: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      });
    }

    if (body.style) {
      const s = body.style;
      const angle = (["soft", "mid", "firm"] as Angle[]).includes(s.defaultAngle as Angle) ? (s.defaultAngle as Angle) : db.settings.style.defaultAngle;
      db.settings.style = {
        ...db.settings.style,
        ...s,
        defaultAngle: angle,
        samples: Array.isArray(s.samples) ? s.samples.map((x) => String(x).trim()).filter(Boolean).slice(0, 20) : db.settings.style.samples,
      };
      // Style changed: old drafts may not match anymore.
      db.messages.forEach((m) => {
        if (m.status === "needs_reply") delete m.drafts;
      });
    }

    if (typeof body.onboarded === "boolean") db.settings.onboarded = body.onboarded;
    if (typeof body.timeZone === "string") {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: body.timeZone });
        db.settings.timeZone = body.timeZone;
      } catch {
        /* not a real time zone: ignore */
      }
    }
    return db.settings;
  });

  let imported = 0;
  if (becameClients.length) {
    const db = await readDB();
    for (const cid of becameClients) {
      const c = db.contacts.find((x) => x.id === cid);
      if (!c) continue;
      for (const igsid of igIdsOf(c.handles)) {
        const { messages: past, error } = await fetchIgHistory(db, igsid);
        if (past.length) imported += await updateDB((fresh) => mergeIgHistory(fresh, cid, past));
        else if (error) await recordHook("instagram", false, `Couldn't bring in ${c.name}'s past messages. ${error}`);
      }
    }
  }

  if (becameClients.length) after(() => logPendingStats());
  return Response.json({ ok: true, settings, imported });
}
