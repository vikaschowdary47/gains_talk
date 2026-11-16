import Anthropic from "@anthropic-ai/sdk";
import { aiEnabled } from "@/lib/ai";

export const dynamic = "force-dynamic";

/** Is the Claude key set, and does a tiny call work? Never returns the key. */
export async function GET() {
  if (!aiEnabled()) return Response.json({ keySet: false, ok: false, detail: "ANTHROPIC_API_KEY isn't set in this deployment. Add it in Vercel and redeploy." });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  try {
    const res = await new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }).messages.create({
      model,
      max_tokens: 5,
      messages: [{ role: "user", content: "Say ok" }],
    });
    return Response.json({ keySet: true, ok: true, model: res.model });
  } catch (e) {
    return Response.json({ keySet: true, ok: false, model, detail: e instanceof Error ? e.message : String(e) });
  }
}
