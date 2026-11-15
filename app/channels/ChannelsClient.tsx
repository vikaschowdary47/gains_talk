"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Channel } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { ChannelIcon, TabBar, Toast, postJSON, useToast } from "@/components/ui";

export interface ChannelRow {
  channel: Channel;
  name: string;
  state: "on" | "partial" | "setup" | "soon" | "manual";
  note: string;
}

const BADGE: Record<ChannelRow["state"], { label: string; bg: string; ink: string }> = {
  on: { label: "On", bg: "var(--mint)", ink: "var(--ink)" },
  partial: { label: "Almost", bg: "var(--amber)", ink: "var(--ink)" },
  setup: { label: "Set up", bg: "var(--peri-tint)", ink: "var(--peri-ink)" },
  soon: { label: "Soon", bg: "#ECECF1", ink: "var(--muted)" },
  manual: { label: "Share in", bg: "var(--amber-tint)", ink: "var(--amber-ink)" },
};

export default function ChannelsClient(p: { rows: ChannelRow[]; clientCount: number; ignoredCount: number; forwarding: string; emailReady: boolean; ai: boolean }) {
  const router = useRouter();
  const [toast, showToast] = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(p.forwarding);
      showToast("Address copied");
    } catch {
      showToast(p.forwarding);
    }
  };

  const reset = async () => {
    if (!window.confirm("Start over with the demo data? This clears everything you've added.")) return;
    await postJSON("/api/reset", {});
    router.push("/welcome");
  };

  return (
    <main className="app plain has-nav">
      <Toast msg={toast} />
      <div className="pad stack">
        <header className="stack-sm" style={{ padding: "0 4px" }}>
          <h1 className="h1" style={{ fontSize: 36, lineHeight: "40px" }}>Channels</h1>
          <p className="lead">GainsTalk reads new client messages and drafts replies. Nothing is sent until you approve it.</p>
        </header>

        <Link href="/onboarding/clients?from=channels" className="list-item" style={{ background: "var(--mint)" }}>
          <span className="avatar" style={{ width: 44, height: 44, borderRadius: 14, background: "var(--navy)", color: "#fff" }}><Icon name="lock" size={22} /></span>
          <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 800 }}>Only {p.clientCount} chosen clients are read</span>
            <span style={{ fontSize: 13, lineHeight: "18px" }}>
              Everyone else is dropped the moment a message arrives and never saved.{p.ignoredCount > 0 ? ` ${p.ignoredCount} ignored so far.` : ""}
            </span>
          </span>
          <Icon name="chevron-right" size={16} stroke={2.4} />
        </Link>

        <ul className="list cards" style={{ gap: 10 }}>
          {p.rows.map((r) => (
            <li key={r.channel} className="list-item" style={{ borderRadius: 22, padding: 14, alignItems: "flex-start" }}>
              <ChannelIcon channel={r.channel} />
              <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{r.name}</span>
                  <span className="pill" style={{ background: BADGE[r.state].bg, color: BADGE[r.state].ink }}>{BADGE[r.state].label}</span>
                </span>
                <span style={{ fontSize: 13, lineHeight: "18px", color: "var(--muted)" }}>{r.note}</span>
                {r.state === "manual" && (
                  <Link href="/add" className="btn btn-pill sm btn-amber" style={{ alignSelf: "flex-start", marginTop: 6 }}>
                    <Icon name="share" size={15} stroke={2.2} /> Add a message
                  </Link>
                )}
              </span>
            </li>
          ))}
        </ul>

        <div className="duo">
        <section className="card" aria-labelledby="email-h">
          <div className="row">
            <ChannelIcon channel="email" />
            <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <h2 id="email-h" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Email</h2>
              <span className="small muted" style={{ lineHeight: "18px" }}>Forward client emails here. Replies still go out from your own address.</span>
            </span>
          </div>
          <div className="row" style={{ gap: 10, height: 52, padding: "0 6px 0 14px", borderRadius: 16, background: "var(--peri-soft)" }}>
            <span className="grow" style={{ fontSize: 15, fontWeight: 700, color: "var(--peri-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.forwarding}</span>
            <button className="btn btn-primary" style={{ height: 40, borderRadius: 12, fontSize: 14, boxShadow: "none" }} onClick={copy}>
              <Icon name="copy" size={15} stroke={2.2} /> Copy
            </button>
          </div>
          {!p.emailReady && <p className="small muted" style={{ margin: 0 }}>The inbound email hook isn&apos;t set up yet. See the README for the 5-minute setup.</p>}
        </section>

        <section className="card" aria-labelledby="style-h" style={{ gap: 8 }}>
          <h2 id="style-h" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Drafts</h2>
          <p className="small muted" style={{ margin: 0 }}>{p.ai ? "AI drafts are on." : "Demo drafts. Add ANTHROPIC_API_KEY to .env.local for real AI drafts."}</p>
          <Link href="/onboarding/voice?from=channels" className="btn btn-white">
            <Icon name="sliders" size={18} /> Your texting style
          </Link>
        </section>
        </div>

        <p className="small muted" style={{ margin: "2px 4px 0", display: "flex", gap: 8 }}>
          <Icon name="lock" size={16} />
          <span>Client messages stay private to your account and are never used to train AI models.</span>
        </p>
        <button className="btn" style={{ background: "transparent", color: "var(--muted)", fontSize: 14 }} onClick={reset}>Start over with demo data</button>
      </div>
      <TabBar />
    </main>
  );
}
