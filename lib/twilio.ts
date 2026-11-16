import "server-only";
import crypto from "node:crypto";

/** Twilio's WhatsApp Sandbox (or a Twilio WhatsApp sender): a testing route that
 *  doesn't need Meta's business account. Used for WhatsApp when it's configured. */
export function twilioReady(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}

export function twilioFrom(): string {
  const raw = (process.env.TWILIO_WHATSAPP_FROM || "").replace(/^whatsapp:/, "").trim();
  return raw.startsWith("+") ? raw : `+${raw.replace(/\D/g, "")}`;
}

/** Where Twilio should send delivery updates. */
export function appUrl(): string {
  return (process.env.APP_URL || "https://www.gainstalk.com").replace(/\/$/, "");
}

const API = () => process.env.TWILIO_API_BASE || "https://api.twilio.com";
const auth = () => "Basic " + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");

/** Check X-Twilio-Signature: HMAC-SHA1 over the URL plus sorted form fields. */
export function verifyTwilio(urls: string[], params: Record<string, string>, signature: string | null): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return true; // not configured yet (local testing)
  if (!signature) return false;
  const tail = Object.keys(params).sort().map((k) => k + params[k]).join("");
  return urls.some((u) => {
    const expected = crypto.createHmac("sha1", token).update(u + tail).digest("base64");
    return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  });
}

/** The public URLs Twilio may have signed for this request (Vercel sits behind a proxy). */
export function signedUrls(req: Request): string[] {
  const u = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || u.host;
  const proto = req.headers.get("x-forwarded-proto") || u.protocol.replace(":", "");
  const path = u.pathname + u.search;
  return [...new Set([req.url, `${proto}://${host}${path}`, `https://${host}${path}`, `${appUrl()}${path}`])];
}

export function explainTwilioError(code: number | undefined, message: string): string {
  if (code === 63015)
    return `This phone hasn't joined your Twilio Sandbox (or its 3-day join ran out). Send "join <your code>" to ${twilioFrom()} on WhatsApp, then send again.`;
  if (code === 20003) return "Twilio didn't accept the Account SID or Auth Token. Check them in Vercel.";
  if (code === 21211 || code === 21614) return "Twilio says this isn't a valid WhatsApp number.";
  if (code === 63016) return "More than 24 hours since this client last messaged, so WhatsApp won't deliver a free-form reply.";
  return `Twilio didn't send it${message ? `: ${message}` : "."}`;
}

/** Send a WhatsApp text through Twilio. Returns the message SID, or an error sentence. */
export async function twilioSend(toDigits: string, text: string): Promise<{ sid: string } | { error: string }> {
  try {
    const body = new URLSearchParams({
      From: `whatsapp:${twilioFrom()}`,
      To: `whatsapp:+${toDigits.replace(/\D/g, "")}`,
      Body: text,
      StatusCallback: `${appUrl()}/api/webhooks/twilio/status`,
    });
    const res = await fetch(`${API()}/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: auth(), "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json().catch(() => ({}))) as { sid?: string; code?: number; message?: string };
    if (res.ok && json.sid) return { sid: json.sid };
    return { error: explainTwilioError(json.code, json.message ?? `HTTP ${res.status}`) };
  } catch (e) {
    return { error: `Couldn't reach Twilio: ${String(e)}` };
  }
}

/** Plain-language check for the Channels screen. */
export async function checkTwilio(): Promise<{ label: string; ok: boolean; detail: string }[]> {
  const checks: { label: string; ok: boolean; detail: string }[] = [];
  try {
    const res = await fetch(`${API()}/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}.json`, { headers: { Authorization: auth() }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    const json = (await res.json().catch(() => ({}))) as { status?: string; type?: string; message?: string };
    checks.push(res.ok
      ? { label: "Twilio account", ok: json.status === "active", detail: `Signed in${json.type ? ` (${json.type.toLowerCase()} account)` : ""}${json.status ? `, ${json.status}` : ""}.` }
      : { label: "Twilio account", ok: false, detail: `Twilio didn't accept the Account SID or Auth Token${json.message ? `: ${json.message}` : "."}` });
  } catch (e) {
    checks.push({ label: "Twilio account", ok: false, detail: `Couldn't reach Twilio: ${String(e)}` });
  }
  checks.push({ label: "WhatsApp number", ok: true, detail: `${twilioFrom()}. Message this number from your phone.` });
  checks.push({ label: "Sandbox join", ok: true, detail: `Each phone sends "join <your code>" to ${twilioFrom()} once. A join lasts 3 days, then send it again.` });
  return checks;
}
