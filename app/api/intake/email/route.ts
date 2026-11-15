import { readDB, updateDB, writeDB } from "@/lib/store";
import { admit } from "@/lib/privacy";
import { uid } from "@/lib/util";

export const dynamic = "force-dynamic";

/**
 * Inbound email webhook. Point your email provider's inbound parse at:
 *   POST /api/intake/email?token=INBOUND_EMAIL_TOKEN
 * Accepts Postmark JSON, SendGrid Inbound Parse (multipart form) or simple JSON
 * like { "from": "...", "subject": "...", "text": "..." }.
 */
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!process.env.INBOUND_EMAIL_TOKEN || token !== process.env.INBOUND_EMAIL_TOKEN) {
    return Response.json({ error: "Bad or missing token" }, { status: 401 });
  }

  let from = "";
  let subject = "";
  let text = "";
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const b = (await req.json()) as Record<string, unknown>;
    const full = b.FromFull as { Email?: string; Name?: string } | undefined;
    from = String(full?.Email ?? b.From ?? b.from ?? "");
    subject = String(b.Subject ?? b.subject ?? "");
    text = String(b.StrippedTextReply || b.TextBody || b.text || b.plain || "");
  } else {
    const f = await req.formData();
    from = String(f.get("from") ?? "");
    subject = String(f.get("subject") ?? "");
    text = String(f.get("text") ?? "");
  }

  let parsed = parseAddress(from);

  // The coach forwarded it by hand: find the original sender inside the body.
  const coach = process.env.COACH_EMAIL?.toLowerCase();
  const forwardedByCoach = (coach && parsed.email === coach) || /forwarded message/i.test(text);
  if (forwardedByCoach) {
    const inner = text.match(/From:\s*(.+?)\r?\n/i);
    if (inner) parsed = parseAddress(inner[1]);
    text = stripForwardHeader(text);
  }

  if (!parsed.email) return Response.json({ error: "No sender found" }, { status: 400 });

  const db = readDB();

  // A coach forwarding an email by hand is a clear signal. If the sender's name
  // matches a client exactly, link this email address to that client.
  if (forwardedByCoach && parsed.name) {
    const byName = db.contacts.find((c) => c.isClient && c.name.toLowerCase() === parsed.name!.toLowerCase());
    if (byName && !byName.handles.some((h) => h.channel === "email" && h.value.toLowerCase() === parsed.email)) {
      byName.handles.push({ channel: "email", value: parsed.email });
    }
  }

  const gate = admit(db, "email", parsed.email, parsed.name);
  if (!gate.admitted) {
    writeDB(db); // saves only the ignored counter / pending name, never the email body
    return Response.json({ ok: true, stored: false, reason: gate.reason });
  }

  const body = cleanEmail(text) || subject;
  writeDB(db); // keeps a newly linked email address
  updateDB((fresh) => {
    fresh.messages.filter((m) => m.clientId === gate.client.id && m.status === "needs_reply").forEach((m) => (m.status = "info"));
    fresh.messages.push({
      id: uid("m_"),
      clientId: gate.client.id,
      channel: "email",
      direction: "in",
      text: body,
      at: new Date().toISOString(),
      status: "needs_reply",
    });
  });
  return Response.json({ ok: true, stored: true });
}

function parseAddress(raw: string): { email: string; name?: string } {
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
  if (m) return { name: m[1].trim() || undefined, email: m[2].trim().toLowerCase() };
  return { email: raw.trim().toLowerCase() };
}

function stripForwardHeader(t: string): string {
  const idx = t.search(/-{2,}\s*Forwarded message\s*-{2,}/i);
  if (idx < 0) return t;
  const rest = t.slice(idx).split(/\r?\n/);
  // drop the header block (From/Date/Subject/To lines)
  let i = 1;
  while (i < rest.length && /^(from|date|sent|subject|to|cc):/i.test(rest[i].trim())) i++;
  return rest.slice(i).join("\n");
}

function cleanEmail(t: string): string {
  return t
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith(">"))
    .join("\n")
    .replace(/\n\s*On [^\n]+wrote:[\s\S]*$/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 4000);
}
