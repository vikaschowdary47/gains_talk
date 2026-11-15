import fs from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/store";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  webm: "audio/webm",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (!/^[\w.-]+$/.test(name)) return new Response("Not found", { status: 404 });
  const file = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name);
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return new Response(fs.readFileSync(file), {
    headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "private, max-age=3600" },
  });
}
