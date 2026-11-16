import { checkWhatsApp } from "@/lib/wa-check";
import { checkTwilio, twilioReady } from "@/lib/twilio";

export const dynamic = "force-dynamic";

/** Channels → WhatsApp → Check connection. { fix: true } links the app to the account. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { fix?: boolean };
  if (twilioReady()) return Response.json({ checks: await checkTwilio(), canFix: false });
  return Response.json(await checkWhatsApp(Boolean(body.fix)));
}
