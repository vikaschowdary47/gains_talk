import "server-only";
import { graphVersion } from "./meta";

export interface Check { label: string; ok: boolean; detail: string }
export interface CheckResult { checks: Check[]; canFix: boolean; number?: string }

const G = () => `${process.env.META_GRAPH_BASE || "https://graph.facebook.com"}/${graphVersion()}`;

async function graph<T>(path: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: string; code?: number }> {
  try {
    const res = await fetch(`${G()}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, ...(init?.headers ?? {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number } };
    if (res.ok && !json.error) return { ok: true, data: json };
    return { ok: false, error: json.error?.message ?? `HTTP ${res.status}`, code: json.error?.code };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Find the WhatsApp Business Account that owns our phone number. */
async function findWaba(phoneId: string): Promise<{ waba?: string; appId?: string }> {
  const token = process.env.WHATSAPP_TOKEN!;
  const dbg = await graph<{ data?: { app_id?: string; granular_scopes?: { scope: string; target_ids?: string[] }[] } }>(
    `/debug_token?input_token=${encodeURIComponent(token)}`
  );
  const appId = dbg.ok ? dbg.data.data?.app_id : undefined;
  const fromEnv = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (fromEnv) return { waba: fromEnv, appId };
  const ids = new Set<string>();
  if (dbg.ok) {
    for (const s of dbg.data.data?.granular_scopes ?? []) {
      if (s.scope.startsWith("whatsapp_business")) (s.target_ids ?? []).forEach((id) => ids.add(id));
    }
  }
  for (const id of ids) {
    const nums = await graph<{ data?: { id: string }[] }>(`/${id}/phone_numbers?fields=id`);
    if (nums.ok && nums.data.data?.some((n) => n.id === phoneId)) return { waba: id, appId };
  }
  return { waba: ids.size === 1 ? [...ids][0] : undefined, appId };
}

/**
 * Plain-language health check of the WhatsApp setup. With fix=true it also
 * links this Meta app to the WhatsApp account, so Meta sends its messages here.
 */
export async function checkWhatsApp(fix = false): Promise<CheckResult> {
  const checks: Check[] = [];
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!process.env.WHATSAPP_TOKEN || !phoneId) {
    checks.push({ label: "Settings", ok: false, detail: "Add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Vercel, then redeploy." });
    return { checks, canFix: false };
  }

  const num = await graph<{ display_phone_number?: string; verified_name?: string; status?: string; code_verification_status?: string }>(
    `/${phoneId}?fields=display_phone_number,verified_name,status,code_verification_status`
  );
  if (!num.ok) {
    const expired = num.code === 190;
    checks.push({
      label: "Access token",
      ok: false,
      detail: expired
        ? "Your WhatsApp token has expired. Temporary tokens from API Setup last about a day. Make a new one there, put it in WHATSAPP_TOKEN in Vercel and redeploy."
        : `Meta didn't accept the token or phone number ID: ${num.error}`,
    });
    return { checks, canFix: false };
  }
  checks.push({ label: "Access token", ok: true, detail: "Meta accepted it." });
  const number = num.data.display_phone_number;
  const status = num.data.status;
  checks.push({
    label: "Phone number",
    ok: !status || status === "CONNECTED",
    detail: `${number ?? "Unknown number"}${num.data.verified_name ? ` (${num.data.verified_name})` : ""}${status ? `, status ${status.toLowerCase()}` : ""}. This is the number to message.`,
  });

  const { waba, appId } = await findWaba(phoneId);
  if (!waba) {
    checks.push({ label: "WhatsApp account", ok: false, detail: "Couldn't find the WhatsApp Business Account. Add its ID (on Meta's API Setup page) as WHATSAPP_BUSINESS_ACCOUNT_ID in Vercel." });
    return { checks, canFix: false, number };
  }

  if (fix) {
    const res = await graph<{ success?: boolean }>(`/${waba}/subscribed_apps`, { method: "POST" });
    checks.push({ label: "Link", ok: res.ok, detail: res.ok ? "Linked. Meta will now send this number's messages to GainsTalk." : `Meta refused the link: ${res.error}` });
  }

  const subs = await graph<{ data?: { whatsapp_business_api_data?: { id?: string; name?: string } }[] }>(`/${waba}/subscribed_apps`);
  if (!subs.ok) {
    checks.push({ label: "Messages to GainsTalk", ok: false, detail: `Couldn't read the link: ${subs.error}` });
    return { checks, canFix: true, number };
  }
  const apps = (subs.data.data ?? []).map((a) => a.whatsapp_business_api_data ?? {});
  const linked = appId ? apps.some((a) => a.id === appId) : apps.length > 0;
  checks.push({
    label: "Messages to GainsTalk",
    ok: linked,
    detail: linked
      ? `Linked${apps.length ? ` (${apps.map((a) => a.name ?? a.id).join(", ")})` : ""}. Messages to ${number ?? "this number"} are sent here.`
      : apps.length
        ? `This WhatsApp account sends its messages to ${apps.map((a) => a.name ?? a.id).join(", ")}, not this app.`
        : "Not linked yet, so Meta doesn't send this number's messages anywhere.",
  });
  return { checks, canFix: !linked, number };
}
