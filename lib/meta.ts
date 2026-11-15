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

export function graphVersion(): string {
  return process.env.META_GRAPH_VERSION || "v23.0";
}
