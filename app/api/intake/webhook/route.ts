import crypto from "node:crypto";
import { updateDB } from "@/lib/store";
import { ingest } from "@/lib/ingest";
import { ALL_CHANNELS, isChannel } from "@/lib/channels";

export const dynamic = "force-dynamic";

/**
 * A simple way in for anything that can make a web request:
 * Zapier or Make (Trainerize, forms), an iPhone Shortcut (texts), or your own scripts.
 *
 * POST /api/intake/webhook?token=INTAKE_TOKEN
 * { "channel": "trainerize", "from": "sofia@example.com", "name": "Sofia Nguyen", "text": "..." }
 * Send one message or an array of them. The privacy gate still applies.
 */
function authorized(req: Request): boolean {
  const expected = process.env.INTAKE_TOKEN;
  if (!expected) return false;
  const url = new URL(req.url);
  const given = url.searchParams.get("token") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  return given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function GET() {
  return Response.json({
    ok: true,
    configured: Boolean(process.env.INTAKE_TOKEN),
    usage: 'POST JSON {"channel","from","name","text"} to this URL with ?token=YOUR_INTAKE_TOKEN',
  });
}

interface Item {
  channel?: string;
  from?: string;
  name?: string;
  text?: string;
  at?: string;
  id?: string;
}

export async function POST(req: Request) {
  if (!process.env.INTAKE_TOKEN) return Response.json({ error: "Set INTAKE_TOKEN to turn this on." }, { status: 503 });
  if (!authorized(req)) return Response.json({ error: "Wrong or missing token." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Item | Item[] | null;
  const items = (Array.isArray(body) ? body : body ? [body] : []).slice(0, 50);
  if (items.length === 0) return Response.json({ error: "Send JSON with channel, from and text." }, { status: 400 });

  const results = await updateDB((db) =>
    items.map((it) => {
      if (!it.from || !it.text) return { ok: false, error: "from and text are required" };
      if (!isChannel(it.channel)) return { ok: false, error: `Unknown channel. Use one of: ${ALL_CHANNELS.join(", ")}` };
      const r = ingest(db, { channel: it.channel, handle: String(it.from), name: it.name, text: String(it.text), at: it.at, externalId: it.id ? `hook_${it.id}` : undefined });
      return r.stored ? { ok: true, stored: true, client: r.client.name } : { ok: true, stored: false, reason: r.reason };
    })
  );
  return Response.json({ ok: true, results });
}
