import { readDB, writeDB } from "@/lib/store";
import { ingest } from "@/lib/ingest";
import { describe, logHook, recordHook } from "@/lib/hooklog";
import { signedUrls, verifyTwilio } from "@/lib/twilio";

export const dynamic = "force-dynamic";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

/**
 * Incoming WhatsApp messages through Twilio (Sandbox or a Twilio sender).
 * Twilio posts form fields: From "whatsapp:+1...", WaId, ProfileName, Body, MessageSid.
 * Same privacy gate as every other channel: non-clients are dropped.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  if (!verifyTwilio(signedUrls(req), params, req.headers.get("x-twilio-signature"))) {
    await recordHook("whatsapp", false, "Twilio: rejected, the signature didn't match. Check TWILIO_AUTH_TOKEN in Vercel.");
    return new Response("Bad signature", { status: 403 });
  }

  const handle = params.WaId || (params.From || "").replace(/^whatsapp:/, "").replace(/\D/g, "");
  const media = Number(params.NumMedia || 0);
  const text = params.Body?.trim() || (media ? "[photo or file]" : "");
  if (!handle || !text) return new Response(EMPTY_TWIML, { headers: { "Content-Type": "text/xml" } });

  const db = await readDB();
  const res = ingest(db, { channel: "whatsapp", handle, name: params.ProfileName, text, externalId: params.MessageSid });
  logHook(db, "whatsapp", true, `Twilio: ${describe([res])}`);
  await writeDB(db);
  // Empty reply: GainsTalk never auto-answers. The coach decides.
  return new Response(EMPTY_TWIML, { headers: { "Content-Type": "text/xml" } });
}
