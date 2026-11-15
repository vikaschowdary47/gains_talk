"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CHANNELS } from "@/lib/channels";
import type { Channel } from "@/lib/types";
import { LogoMark } from "@/components/Logo";
import { Icon } from "./Icon";

export function Avatar({ initials, color, size = 44 }: { initials: string; color: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.34) }}>
      {initials}
    </span>
  );
}

const ICON_FOR = { chat: "chat", photo: "photo", mail: "mail", note: "note", app: "app", text: "text" } as const;

export function ChannelChip({ channel }: { channel: Channel }) {
  const meta = CHANNELS[channel];
  return (
    <span className="chip" style={{ background: meta.tint, color: meta.ink }}>
      <Icon name={ICON_FOR[meta.icon]} size={12} stroke={2.4} />
      {meta.label}
    </span>
  );
}

export function ChannelIcon({ channel, size = 48 }: { channel: Channel; size?: number }) {
  const meta = CHANNELS[channel];
  return (
    <span style={{ width: size, height: size, flex: "none", borderRadius: size * 0.31, display: "flex", alignItems: "center", justifyContent: "center", background: meta.tint, color: meta.ink }}>
      <Icon name={ICON_FOR[meta.icon]} size={Math.round(size * 0.5)} />
    </span>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

const TABS = [
  { href: "/today", label: "Today", icon: "sun" },
  { href: "/clients", label: "Clients", icon: "people" },
  { href: "/wins", label: "Wins", icon: "star" },
  { href: "/channels", label: "Channels", icon: "link" },
] as const;

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar" aria-label="GainsTalk">
      <Link href="/today" className="brand"><span aria-hidden="true"><LogoMark size={30} /></span>GainsTalk</Link>
      <nav aria-label="Main">
        {TABS.map((t) => {
          const on = path === t.href || path.startsWith(t.href + "/") || (t.href === "/today" && /^\/(reply|voice-note)\//.test(path));
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}>
              <Icon name={t.icon} size={20} stroke={2.1} />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Link href="/add" className="add"><Icon name="plus" size={18} stroke={2.4} /> Add a message</Link>
      <p className="side-foot">
        <Icon name="lock" size={15} />
        <span>Only chats with your chosen clients are read. Nothing is sent without your OK.</span>
      </p>
    </aside>
  );
}

/** Mobile: floating tab bar. Desktop: sidebar. */
export function TabBar() {
  const path = usePathname();
  return (
    <>
      <Sidebar />
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => {
          const on = path === t.href || path.startsWith(t.href + "/") || (t.href === "/today" && /^\/(reply|voice-note)\//.test(path));
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}>
              <Icon name={t.icon} size={20} stroke={2.1} />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function useToast(): [string | null, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2800);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg, useCallback((m: string) => setMsg(m), [])];
}

export function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="toast" role="status">
      {msg}
    </div>
  );
}

export async function postJSON<T = Record<string, unknown>>(url: string, body: unknown): Promise<T & { error?: string }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok && !data.error) (data as { error?: string }).error = `Request failed (${res.status})`;
  return data;
}

/** Copy text and open the client's chat so the coach can tap send. */
export async function copyAndOpen(text: string, url?: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* clipboard can be blocked; the link still carries the text where supported */
  }
  if (url) window.open(url, "_blank", "noopener");
}
