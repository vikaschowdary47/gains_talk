import { readDB, writeDB } from "@/lib/store";
import { logHook } from "@/lib/hooklog";
import { explainTwilioError, signedUrls, verifyTwilio } from "@/lib/twilio";

export const dynamic = "force-dynamic";

/** Twilio delivery updates for replies we sent. Only failures matter here. */
export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));
  if (!verifyTwilio(signedUrls(req), params, req.headers.get("x-twilio-signature"))) return new Response("Bad signature", { status: 403 });

  const status = params.MessageStatus;
  if (status !== "failed" && status !== "undelivered") return new Response(null, { status: 204 });

  const db = await readDB();
  const why = explainTwilioError(Number(params.ErrorCode) || undefined, params.ErrorMessage || "");
  const sent = db.messages.find((m) => m.direction === "out" && m.externalId === params.MessageSid);
  if (sent) sent.sendError = `Not delivered. ${why}`;
  logHook(db, "whatsapp", false, `Twilio: a reply wasn't delivered. ${why}`);
  await writeDB(db);
  return new Response(null, { status: 204 });
}
