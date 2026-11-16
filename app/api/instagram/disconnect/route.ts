import { updateDB } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Forget the connected Instagram account. Messages already in GainsTalk stay. */
export async function POST() {
  await updateDB((db) => {
    delete db.settings.instagram;
  });
  return Response.json({ ok: true });
}
