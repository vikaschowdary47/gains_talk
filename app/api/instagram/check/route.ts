import { checkInstagram } from "@/lib/ig-check";

export const dynamic = "force-dynamic";

/** Channels → Instagram → Check connection. { fix: true } subscribes the account to DMs. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { fix?: boolean };
  return Response.json(await checkInstagram(Boolean(body.fix)));
}
