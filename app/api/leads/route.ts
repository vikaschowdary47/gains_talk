import { updateDB } from "@/lib/store";
import { uid } from "@/lib/util";

export const dynamic = "force-dynamic";

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/** Early-access form on /coaches. Public, so it keeps only these four short fields. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return Response.redirect(new URL("/coaches?sent=error#early-access", req.url), 303);
  if (clip(form.get("website"), 10)) return Response.redirect(new URL("/coaches?sent=1#early-access", req.url), 303); // bots fill hidden fields
  const name = clip(form.get("name"), 80);
  const instagram = clip(form.get("instagram"), 60).replace(/^@+/, "");
  if (!name || !instagram) return Response.redirect(new URL("/coaches?sent=missing#early-access", req.url), 303);
  await updateDB((db) => {
    db.leads ??= [];
    if (db.leads.length >= 2000) return;
    if (db.leads.some((l) => l.instagram.toLowerCase() === instagram.toLowerCase())) return;
    db.leads.unshift({ id: uid("lead_"), name, instagram, clients: clip(form.get("clients"), 20), channel: clip(form.get("channel"), 30), at: new Date().toISOString() });
  });
  return Response.redirect(new URL("/coaches?sent=1#early-access", req.url), 303);
}
