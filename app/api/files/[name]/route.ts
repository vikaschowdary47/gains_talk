import { readUpload } from "@/lib/store";

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
  const data = await readUpload(name);
  if (!data) return new Response("Not found", { status: 404 });
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "private, max-age=3600" },
  });
}
