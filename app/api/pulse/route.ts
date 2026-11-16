import { readDB } from "@/lib/store";

export const dynamic = "force-dynamic";

/** A cheap fingerprint of the inbox. Pages poll it and refresh only when it changes. */
export async function GET() {
  const db = await readDB();
  const last = db.messages.reduce((a, m) => (m.at > a ? m.at : a), "");
  const open = db.messages.filter((m) => m.status === "needs_reply").length;
  const stats = db.contacts.reduce((n, c) => n + (c.stats?.length ?? 0), 0);
  return Response.json({ v: `${db.messages.length}:${last}:${open}:${db.pending.length}:${db.contacts.length}:${stats}` });
}
