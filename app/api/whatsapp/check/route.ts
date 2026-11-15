import { checkWhatsApp } from "@/lib/wa-check";

export const dynamic = "force-dynamic";

/** Channels → WhatsApp → Check connection. { fix: true } links the app to the account. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { fix?: boolean };
  return Response.json(await checkWhatsApp(Boolean(body.fix)));
}
