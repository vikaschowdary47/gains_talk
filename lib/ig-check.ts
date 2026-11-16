import "server-only";
import { readDB, updateDB } from "./store";
import { FB_BASE, IG_BASE, igToken } from "./instagram";

type Check = { label: string; ok: boolean; detail: string };

async function call(url: string, token: string, method = "GET", body?: URLSearchParams) {
  try {
    const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body, cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: { message?: string; code?: number } };
    return { ok: res.ok && !json.error, json, error: json.error?.message || (res.ok ? "" : `HTTP ${res.status}`) };
  } catch (e) {
    return { ok: false, json: {} as Record<string, unknown>, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Ask Meta whether the Instagram token works and whether the account sends DMs to this app.
 *  With fix=true, subscribe the account to the messages field. */
export async function checkInstagram(fix: boolean): Promise<{ checks: Check[]; canFix: boolean }> {
  const db = await readDB();
  const token = igToken(db);
  const checks: Check[] = [];
  if (!token) return { checks: [{ label: "Access token", ok: false, detail: "GainsTalk has no Instagram token. Add INSTAGRAM_TOKEN in Vercel and redeploy." }], canFix: false };

  // Different Meta token types answer on different servers; try each and keep the one that works.
  const envId = process.env.INSTAGRAM_ACCOUNT_ID?.trim();
  const tries: { base: string; account: string }[] = [
    { base: IG_BASE(), account: "me" },
    ...(envId ? [{ base: FB_BASE(), account: envId }, { base: IG_BASE(), account: envId }] : []),
  ];
  let base = "", account = "", id = "";
  const errors: string[] = [];
  for (const t of tries) {
    const r = await call(`${t.base}/${t.account}?fields=id,username`, token);
    const r2 = r.ok ? r : await call(`${t.base}/${t.account}?fields=id`, token);
    if (r2.ok) {
      base = t.base; account = t.account; id = String(r2.json.id ?? "");
      const name = r2.json.username ? `@${r2.json.username}` : `account ${id}`;
      checks.push({ label: "Access token", ok: true, detail: `Meta accepted it for ${name} (${new URL(t.base).host}).` });
      break;
    }
    errors.push(`${new URL(t.base).host}/${t.account}: ${r2.error}`);
  }
  if (!base) {
    checks.push({ label: "Access token", ok: false, detail: `No Meta server accepted it. ${errors.join(" | ")}` });
    return { checks, canFix: false };
  }
  await updateDB((d) => { d.settings.igRoute = { base, account }; });

  if (fix) {
    const r = await call(`${base}/${account}/subscribed_apps`, token, "POST", new URLSearchParams({ subscribed_fields: "messages" }));
    checks.push({ label: "Subscribe to DMs", ok: r.ok, detail: r.ok ? "Done. New DMs should now reach GainsTalk." : `Meta said: ${r.error}` });
  }

  const subs = await call(`${base}/${account}/subscribed_apps`, token);
  if (!subs.ok) {
    checks.push({ label: "DMs to GainsTalk", ok: false, detail: `Couldn't read the subscription: ${subs.error}` });
    return { checks, canFix: true };
  }
  const apps = (subs.json.data as { name?: string; subscribed_fields?: string[] }[] | undefined) ?? [];
  const withMessages = apps.find((a) => (a.subscribed_fields ?? []).includes("messages"));
  checks.push(
    withMessages
      ? { label: "DMs to GainsTalk", ok: true, detail: `Subscribed (${withMessages.name ?? "your app"}: ${(withMessages.subscribed_fields ?? []).join(", ")}).` }
      : { label: "DMs to GainsTalk", ok: false, detail: apps.length ? `The account is linked but not to the messages field (${apps.map((a) => (a.subscribed_fields ?? []).join(", ")).join("; ") || "no fields"}).` : "This account isn't subscribed, so Meta won't send its DMs here." },
  );
  return { checks, canFix: !withMessages };
}
