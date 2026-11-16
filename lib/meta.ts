import "server-only";
import crypto from "node:crypto";

/** Meta (WhatsApp / Instagram / Messenger) webhook signature check. */
export function verifyMetaSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true; // Not configured yet: accept (local testing only).
  if (!header?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = header.slice(7);
  return expected.length === given.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/** Answer Meta's webhook verification handshake. */
export function verifyChallenge(req: Request, token: string | undefined): Response {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const given = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && given === token && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

/** Meta's Graph API address (META_GRAPH_BASE lets tests point at a stand-in). */
export function graphBase(): string {
  return process.env.META_GRAPH_BASE || "https://graph.facebook.com";
}

export function graphVersion(): string {
  return process.env.META_GRAPH_VERSION || "v25.0";
}

/** Best-effort profile lookup so new senders show a real name, not a number. */
export async function lookupProfile(channel: "instagram" | "messenger", userId: string): Promise<{ name?: string; username?: string }> {
  try {
    const ctrl = AbortSignal.timeout(2500);
    if (channel === "instagram" && process.env.INSTAGRAM_TOKEN) {
      const res = await fetch(`https://graph.instagram.com/${graphVersion()}/${userId}?fields=name,username`, {
        headers: { Authorization: `Bearer ${process.env.INSTAGRAM_TOKEN}` },
        signal: ctrl,
        cache: "no-store",
      });
      if (res.ok) {
        const j = (await res.json()) as { name?: string; username?: string };
        return { name: j.name || j.username, username: j.username };
      }
    }
    if (channel === "messenger" && process.env.MESSENGER_PAGE_TOKEN) {
      const res = await fetch(
        `https://graph.facebook.com/${graphVersion()}/${userId}?fields=first_name,last_name&access_token=${encodeURIComponent(process.env.MESSENGER_PAGE_TOKEN)}`,
        { signal: ctrl, cache: "no-store" }
      );
      if (res.ok) {
        const j = (await res.json()) as { first_name?: string; last_name?: string };
        const name = [j.first_name, j.last_name].filter(Boolean).join(" ");
        return { name: name || undefined };
      }
    }
  } catch {
    // Lookup is optional: fall back to the id.
  }
  return {};
}
