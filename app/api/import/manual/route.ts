import { updateDB } from "@/lib/store";
import { addHandle } from "@/lib/ingest";
import { findByHandle } from "@/lib/privacy";
import { avatarFor, initialsOf, uid } from "@/lib/util";
import type { Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Add several clients at once from pasted lines: "Name, phone or handle" per line
 * (a column copied from a spreadsheet or a coaching app's export works too).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { channel?: Channel; text?: string };
  const channel: Channel = body.channel === "instagram" || body.channel === "email" || body.channel === "texts" ? body.channel : "whatsapp";
  const rows = String(body.text ?? "")
    .split(/\r?\n/)
    .map((l) => l.split(/[,\t;]/).map((x) => x.trim()).filter(Boolean))
    .filter((r) => r.length > 0)
    .slice(0, 500);
  if (rows.length === 0) return Response.json({ error: "Paste at least one line: a name and a number." }, { status: 400 });

  const since = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const looksLikeHandle = (v: string) => /\d{7,}/.test(v.replace(/\D/g, "")) || v.includes("@");
  const result = await updateDB((db) => {
    let added = 0;
    let updated = 0;
    const skipped: string[] = [];
    for (const r of rows) {
      const handle = r.find(looksLikeHandle);
      const name = r.find((x) => x !== handle) ?? handle;
      if (!handle || !name) {
        skipped.push(r.join(", "));
        continue;
      }
      const value = channel === "whatsapp" || channel === "texts" ? handle.replace(/[^\d+]/g, "") : handle.replace(/^@/, "");
      const existing = findByHandle(db, channel, value);
      if (existing) {
        existing.isClient = true;
        updated++;
        continue;
      }
      const c = { id: uid("c_"), name, initials: initialsOf(name), avatar: avatarFor(name), handles: [], isClient: true, goals: [], since };
      addHandle(c, channel, value);
      db.contacts.push(c);
      added++;
    }
    return { added, updated, skipped };
  });
  return Response.json({ ok: true, ...result });
}
