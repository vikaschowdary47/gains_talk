import { readDB, updateDB } from "@/lib/store";
import { scanWins } from "@/lib/ai";
import type { Permission } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: string; id?: string; value?: Permission };

  if (body.action === "scan") {
    const found = await scanWins(readDB());
    updateDB((db) => {
      db.wins.unshift(...found);
    });
    return Response.json({ ok: true, added: found.length });
  }

  if (body.action === "permission" && body.id && ["none", "asked", "yes"].includes(body.value ?? "")) {
    updateDB((db) => {
      const w = db.wins.find((x) => x.id === body.id);
      if (w) w.permission = body.value!;
    });
    return Response.json({ ok: true });
  }

  if (body.action === "remove" && body.id) {
    updateDB((db) => {
      db.wins = db.wins.filter((w) => w.id !== body.id);
    });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
