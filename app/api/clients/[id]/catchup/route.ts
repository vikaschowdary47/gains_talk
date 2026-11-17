import { readDB, updateDB } from "@/lib/store";
import { fetchIgHistory, igIdsOf, mergeIgHistory } from "@/lib/ig-history";
import { logPendingStats } from "@/lib/stats";
import { buildProfile } from "@/lib/profile";
import { aiEnabled } from "@/lib/ai";
import { refreshBrief } from "@/lib/brief";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Profile → "Catch up": bring in recent Instagram messages, then refresh notes and stats. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDB();
  const c = db.contacts.find((x) => x.id === id && x.isClient);
  if (!c) return Response.json({ error: "Client not found." }, { status: 404 });

  let imported = 0;
  let problem: string | undefined;
  for (const igsid of igIdsOf(c.handles)) {
    const { messages, error } = await fetchIgHistory(db, igsid);
    if (messages.length) imported += await updateDB((fresh) => mergeIgHistory(fresh, id, messages));
    else if (error) problem = error;
  }
  const stats = await logPendingStats(80);
  const learned = await buildProfile(id);
  await refreshBrief(id, true);
  return Response.json({
    ok: true,
    imported,
    stats,
    learned,
    problem: problem ?? (!aiEnabled() ? "No Claude key is set, so notes can't be filled in." : !learned ? "Claude couldn't read the messages right now. Check the notice on Today." : undefined),
  });
}
