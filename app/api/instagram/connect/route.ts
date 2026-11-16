import crypto from "node:crypto";
import { cookies } from "next/headers";
import { igAuthorizeUrl, instagramLoginReady } from "@/lib/instagram";

export const dynamic = "force-dynamic";

/** Channels → Connect Instagram: send the coach to Instagram's sign-in. */
export async function GET(req: Request) {
  if (!instagramLoginReady()) return Response.redirect(new URL("/channels?ig=setup", req.url), 302);
  const state = crypto.randomBytes(16).toString("hex");
  (await cookies()).set("ig_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return Response.redirect(igAuthorizeUrl(state), 302);
}
