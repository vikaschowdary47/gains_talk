import { updateDB } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { id, done } = (await req.json().catch(() => ({}))) as { id?: string; done?: boolean };
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  const ok = updateDB((db) => {
    const p = db.promises.find((x) => x.id === id);
    if (!p) return false;
    p.done = Boolean(done);
    return true;
  });
  return ok ? Response.json({ ok: true }) : Response.json({ error: "Not found" }, { status: 404 });
}
