import { after } from "next/server";
import { readDB, updateDB } from "@/lib/store";
import { addHandle } from "@/lib/ingest";
import { findByHandle } from "@/lib/privacy";
import { fetchIgHistory, mergeIgHistory, type IgPerson } from "@/lib/ig-history";
import { logPendingStats } from "@/lib/stats";
import { buildProfile } from "@/lib/profile";
import { refreshBrief } from "@/lib/brief";
import { recordHook } from "@/lib/hooklog";
import { avatarFor, initialsOf, uid } from "@/lib/util";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Add the people the coach picked as clients. With history: true, also bring in
 * their recent messages (Instagram allows the last 20 per chat) and fill in their profiles.
 * The page sends a few people at a time so it can show progress.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { people?: IgPerson[]; history?: boolean };
  const people = (body.people ?? []).filter((p) => p && /^\d{6,}$/.test(String(p.igsid))).slice(0, 12);
  if (people.length === 0) return Response.json({ error: "Pick at least one person." }, { status: 400 });

  const since = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const ids = await updateDB((db) => {
    const out: string[] = [];
    for (const p of people) {
      const label = p.name?.trim() || (p.username ? `@${p.username}` : "Instagram client");
      let c = findByHandle(db, "instagram", p.igsid) ?? (p.username ? findByHandle(db, "instagram", p.username) : undefined);
      if (!c) {
        c = { id: uid("c_"), name: label, initials: initialsOf(label.replace(/^@/, "")), avatar: avatarFor(label), handles: [], isClient: true, goals: [], since };
        db.contacts.push(c);
      }
      c.isClient = true;
      c.since ??= since;
      addHandle(c, "instagram", p.igsid);
      if (p.username) addHandle(c, "instagram", p.username);
      db.pending = db.pending.filter((x) => !(x.handle.channel === "instagram" && (x.handle.value === p.igsid || x.handle.value === p.username)));
      out.push(c.id);
    }
    return out;
  });

  let imported = 0;
  const problems: string[] = [];
  if (body.history) {
    const db = await readDB();
    for (let i = 0; i < people.length; i++) {
      const { messages, error } = await fetchIgHistory(db, people[i].igsid);
      if (messages.length) imported += await updateDB((fresh) => mergeIgHistory(fresh, ids[i], messages));
      else if (error) problems.push(error);
    }
    if (problems.length) await recordHook("instagram", false, `Some past messages couldn't be brought in. ${problems[0]}`);
    after(async () => {
      await logPendingStats(80);
      for (const id of ids) {
        await buildProfile(id);
        await refreshBrief(id, true);
      }
    });
  }

  return Response.json({ ok: true, added: ids.length, imported, problem: problems[0] });
}
