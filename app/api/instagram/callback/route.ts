import { cookies } from "next/headers";
import { updateDB } from "@/lib/store";
import { igConnect } from "@/lib/instagram";
import { logHook } from "@/lib/hooklog";

export const dynamic = "force-dynamic";

/** Instagram sends the coach back here after sign-in. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (q: Record<string, string>) => Response.redirect(new URL(`/channels?${new URLSearchParams(q)}`, req.url), 302);
  const jar = await cookies();
  const expected = jar.get("ig_state")?.value;
  jar.delete("ig_state");

  if (url.searchParams.get("error")) return back({ ig: "error", reason: url.searchParams.get("error_description") || "Sign-in was cancelled." });
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) return back({ ig: "error", reason: "The sign-in link expired. Try Connect Instagram again." });

  try {
    const conn = await igConnect(code);
    await updateDB((db) => {
      db.settings.instagram = conn;
      logHook(db, "instagram", true, `Connected${conn.username ? ` as @${conn.username}` : ""}. DMs to this account now come here.`);
    });
    return back({ ig: "connected" });
  } catch (e) {
    return back({ ig: "error", reason: e instanceof Error ? e.message : String(e) });
  }
}
