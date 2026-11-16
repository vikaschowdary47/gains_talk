import "server-only";
import type { DB } from "./types";
import { graphBase, graphVersion } from "./meta";

/**
 * Instagram API with Unified Login (what Meta offers newer apps): the coach taps
 * Connect Instagram, signs in with Meta, picks their business portfolio and
 * Instagram professional account, and we get a Business Integration System User
 * token for it. Uses graph.facebook.com. Needs META_APP_ID, META_APP_SECRET and
 * INSTAGRAM_CONFIG_ID (the Unified login configuration), and the redirect URL
 * below registered on that configuration.
 */
const IG_SETTINGS = ["META_APP_ID", "META_APP_SECRET", "INSTAGRAM_CONFIG_ID"] as const;

/** Settings the server can't see (names only, never values). */
export function instagramMissing(): string[] {
  return IG_SETTINGS.filter((k) => !process.env[k]?.trim());
}

export function instagramLoginReady(): boolean {
  return instagramMissing().length === 0;
}

export function igRedirectUri(): string {
  return `${(process.env.APP_URL || "https://www.gainstalk.com").replace(/\/$/, "")}/api/instagram/callback`;
}

const G = () => `${graphBase()}/${graphVersion()}`;

export function igAuthorizeUrl(state: string): string {
  const q = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    config_id: process.env.INSTAGRAM_CONFIG_ID!,
    redirect_uri: igRedirectUri(),
    response_type: "code",
    override_default_response_type: "true",
    state,
  });
  return `${process.env.META_DIALOG_BASE || "https://www.facebook.com"}/${graphVersion()}/dialog/oauth?${q}`;
}

type MetaJson = { error?: { message?: string; code?: number } };
async function call<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & MetaJson }> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const data = (await res.json().catch(() => ({}))) as T & MetaJson;
  return { ok: res.ok && !data.error, status: res.status, data };
}
const why = (d: MetaJson, status: number) => d.error?.message || `HTTP ${status}`;

export interface IgConnection { userId: string; username?: string; token: string; expiresAt: string; connectedAt: string }

/** Code from the redirect → system-user token, the shared Instagram account, webhook subscription. */
export async function igConnect(code: string): Promise<IgConnection> {
  const q = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: igRedirectUri(),
    code,
  });
  const t = await call<{ access_token?: string; expires_in?: number }>(`${G()}/oauth/access_token?${q}`);
  if (!t.ok || !t.data.access_token) throw new Error(`Meta didn't accept the sign-in: ${why(t.data, t.status)}`);
  const token = t.data.access_token;

  // With this token, /me is the business's system user; ask which Instagram accounts it can use.
  const a = await call<{ data?: { id: string; username?: string }[] }>(`${G()}/me/assigned_instagram_accounts?fields=id,username&access_token=${encodeURIComponent(token)}`);
  if (!a.ok) throw new Error(`Couldn't read the Instagram account: ${why(a.data, a.status)}`);
  const acct = a.data.data?.[0];
  if (!acct) throw new Error("No Instagram account was shared. Connect again and pick your Instagram professional account.");

  // Ask Instagram to send this account's DMs to our webhook.
  const s = await call<{ success?: boolean }>(`${G()}/${acct.id}/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ subscribed_fields: "messages", access_token: token }),
  });
  if (!s.ok) throw new Error(`Connected, but Instagram wouldn't turn on message updates: ${why(s.data, s.status)}`);

  return {
    userId: acct.id,
    username: acct.username,
    token,
    // System-user tokens from this setup don't expire unless the configuration says so.
    expiresAt: t.data.expires_in ? new Date(Date.now() + t.data.expires_in * 1000).toISOString() : "9999-12-31T00:00:00.000Z",
    connectedAt: new Date().toISOString(),
  };
}

/** The token to use for Instagram calls: the connected account first, then INSTAGRAM_TOKEN. */
export function igToken(db?: DB): string | undefined {
  return db?.settings.instagram?.token || process.env.INSTAGRAM_TOKEN?.trim() || undefined;
}

/** Where Instagram API calls go: Unified Login (connected account) or a hand-pasted Instagram Login token. */
export function igApi(db?: DB): { base: string; account: string } {
  const c = db?.settings.instagram;
  if (c) return { base: G(), account: c.userId };
  // A token generated in the App Dashboard: Instagram user tokens start with "IG" and use
  // graph.instagram.com; business (system-user) tokens use graph.facebook.com and need the account ID.
  const token = process.env.INSTAGRAM_TOKEN?.trim() || "";
  const account = process.env.INSTAGRAM_ACCOUNT_ID?.trim() || "me";
  if (token.startsWith("IG")) return { base: `${process.env.INSTAGRAM_GRAPH_BASE || "https://graph.instagram.com"}/${graphVersion()}`, account };
  return { base: G(), account };
}
