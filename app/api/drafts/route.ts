import { readDB, updateDB } from "@/lib/store";
import { generateDrafts } from "@/lib/ai";

export const dynamic = "force-dynamic";

/** Get (or make) the three reply angles for a message. */
export async function POST(req: Request) {
  const { messageId, refresh, mode } = (await req.json().catch(() => ({}))) as { messageId?: string; refresh?: boolean; mode?: "reply" | "nudge" };
  const nudge = mode === "nudge";
  if (!messageId) return Response.json({ error: "messageId is required" }, { status: 400 });

  const db = await readDB();
  const msg = db.messages.find((m) => m.id === messageId);
  if (!msg) return Response.json({ error: "Message not found" }, { status: 404 });
  const cached = nudge ? msg.nudgeDrafts : msg.drafts;
  if (cached && !refresh) return Response.json({ drafts: cached });

  try {
    const drafts = await generateDrafts(db, msg, nudge ? "nudge" : "reply");
    await updateDB((fresh) => {
      const m = fresh.messages.find((x) => x.id === messageId);
      if (m) {
        if (nudge) m.nudgeDrafts = drafts;
        else m.drafts = drafts;
      }
    });
    return Response.json({ drafts });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
