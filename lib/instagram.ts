import "server-only";
import type { DB } from "./types";
import { graphVersion } from "./meta";

/**
 * Instagram API with Instagram Login: the coach taps Connect Instagram, signs in,
 * and we keep a long-lived token for their professional account. Needs
 * INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET (Meta app → Instagram → API setup
 * with Instagram login), and the redirect URL below added there.
 */
export const IG_SCOPES = ["instagram_business_basic", "instagram_business_manage_messages"];

export function instagramLoginReady(): boolean {
  return Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);
}

export function igRedirectUri(): string {
  return `${(process.env.APP_URL || "https://www.gainstalk.com").replace(/\/$/, "")}/api/instagram/callback`;
}

const IG_GRAPH = () => process.env.INSTAGRAM_GRAPH_BASE || "https://graph.instagram.com";
const IG_API = () => process.env.INSTAGRAM_API_BASE || "https://api.instagram.com";

export function igAuthorizeUrl(state: string): string {
  const q = new URLSearchParams({
    enable_fb_login: "0",
    force_authentication: "1",
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: igRedirectUri(),
    response_type: "code",
    scope: IG_SCOPES.join(","),
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${q}`;
}

async function json<T>(res: Response): Promise<T & { error?: { message?: string } | string; error_message?: string }> {
  return (await res.json().catch(() => ({}))) as T & { error?: { message?: string } | string; error_message?: string };
}
function errText(j: { error?: { message?: string } | string; error_message?: string }, status: number): string {
  if (typeof j.error === "string") return j.error_message || j.error;
  return j.error?.message || j.error_message || `HTTP ${status}`;
}

export interface IgConnection { userId: string; username?: string; token: string; expiresAt: string; connectedAt: string }

/** Code from the redirect → long-lived token, account details and webhook subscription. */
export async function igConnect(code: string): Promise<IgConnection> {
  // 1. Short-lived token
  const form = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: igRedirectUri(),
    code,
  });
  const r1 = await fetch(`${IG_API()}/oauth/access_token`, { method: "POST", body: form, cache: "no-store" });
  const j1 = await json<{ access_token?: string; user_id?: string | number; data?: { access_token?: string; user_id?: string | number }[] }>(r1);
  const short = j1.access_token ?? j1.data?.[0]?.access_token;
  if (!r1.ok || !short) throw new Error(`Instagram didn't accept the sign-in: ${errText(j1, r1.status)}`);

  // 2. Long-lived token (about 60 days)
  const q2 = new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: process.env.INSTAGRAM_APP_SECRET!, access_token: short });
  const r2 = await fetch(`${IG_GRAPH()}/access_token?${q2}`, { cache: "no-store" });
  const j2 = await json<{ access_token?: string; expires_in?: number }>(r2);
  if (!r2.ok || !j2.access_token) throw new Error(`Couldn't get a lasting Instagram token: ${errText(j2, r2.status)}`);
  const token = j2.access_token;

  // 3. Which account this is (user_id matches the id in webhooks)
  const r3 = await fetch(`${IG_GRAPH()}/${graphVersion()}/me?fields=user_id,username&access_token=${encodeURIComponent(token)}`, { cache: "no-store" });
  const j3 = await json<{ user_id?: string | number; id?: string; username?: string }>(r3);
  if (!r3.ok) throw new Error(`Couldn't read the Instagram account: ${errText(j3, r3.status)}`);

  // 4. Ask Instagram to send this account's DMs to our webhook
  const r4 = await fetch(`${IG_GRAPH()}/${graphVersion()}/me/subscribed_apps?subscribed_fields=messages&access_token=${encodeURIComponent(token)}`, { method: "POST", cache: "no-store" });
  const j4 = await json<{ success?: boolean }>(r4);
  if (!r4.ok) throw new Error(`Connected, but Instagram wouldn't turn on message updates: ${errText(j4, r4.status)}`);

  return {
    userId: String(j3.user_id ?? j3.id ?? ""),
    username: j3.username,
    token,
    expiresAt: new Date(Date.now() + (j2.expires_in ?? 60 * 86400) * 1000).toISOString(),
    connectedAt: new Date().toISOString(),
  };
}

/** The token to use for Instagram calls: the connected account first, then INSTAGRAM_TOKEN. */
export function igToken(db?: DB): string | undefined {
  return db?.settings.instagram?.token || process.env.INSTAGRAM_TOKEN || undefined;
}

/** Long-lived tokens last ~60 days; refresh when fewer than 20 days are left. Mutates db; caller saves. */
export async function igRefreshIfNeeded(db: DB): Promise<boolean> {
  const c = db.settings.instagram;
  if (!c) return false;
  if (new Date(c.expiresAt).getTime() - Date.now() > 20 * 86400_000) return false;
  try {
    const r = await fetch(`${IG_GRAPH()}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(c.token)}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    const j = await json<{ access_token?: string; expires_in?: number }>(r);
    if (!r.ok || !j.access_token) return false;
    c.token = j.access_token;
    c.expiresAt = new Date(Date.now() + (j.expires_in ?? 60 * 86400) * 1000).toISOString();
    return true;
  } catch {
    return false;
  }
}
