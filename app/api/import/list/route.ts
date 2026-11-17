import { readDB } from "@/lib/store";
import { listIgPeople } from "@/lib/ig-history";
import { findByHandle } from "@/lib/privacy";

export const dynamic = "force-dynamic";

/** People the coach chatted with on Instagram: names and dates only, plus whether each is already a client. */
export async function GET() {
  const db = await readDB();
  const { people, error } = await listIgPeople(db);
  return Response.json({
    error,
    people: people.map((p) => {
      const c = findByHandle(db, "instagram", p.igsid) ?? (p.username ? findByHandle(db, "instagram", p.username) : undefined);
      return { ...p, status: c ? (c.isClient ? "client" : "hidden") : "new" };
    }),
  });
}
