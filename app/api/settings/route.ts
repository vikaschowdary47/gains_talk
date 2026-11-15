import { updateDB } from "@/lib/store";
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
    newClient?: { name: string; channel: string; handle: string };
    style?: Partial<StyleSettings>;
    onboarded?: boolean;
  };

  const settings = updateDB((db) => {
    if (body.apps) db.settings.apps = body.apps.filter(isChannel);

    if (body.clients) {
      for (const c of db.contacts) {
        if (c.id in body.clients) c.isClient = Boolean(body.clients[c.id]);
      }
    }

    if (body.addPending) {
      const p = db.pending.find((x) => x.id === body.addPending);
      if (p) {
        db.contacts.push({
          id: uid("c_"), name: p.name, initials: initialsOf(p.name), avatar: avatarFor(p.name),
          handles: [p.handle], isClient: true, goals: [], since: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
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
    return db.settings;
  });

  return Response.json({ ok: true, settings });
}
