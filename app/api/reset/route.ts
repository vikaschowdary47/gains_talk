import { resetDB } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Start over with the demo data (and onboarding). */
export async function POST() {
  await resetDB();
  return Response.json({ ok: true });
}
