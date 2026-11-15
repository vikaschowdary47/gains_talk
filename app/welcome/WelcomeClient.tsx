"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { ALL_CHANNELS, CHANNELS } from "@/lib/channels";
import type { Channel } from "@/lib/types";
import { LogoMark } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { postJSON } from "@/components/ui";

const SPOTS: Record<Channel, CSSProperties> = {
  whatsapp: { left: 4, top: 8 },
  instagram: { left: "38%", top: 0 },
  messenger: { right: 2, top: 18 },
  tiktok: { left: 0, top: 84 },
  trainerize: { right: 0, top: 96 },
  email: { left: 34, bottom: 6 },
  texts: { right: 40, bottom: 0 },
};

export default function WelcomeClient({ initialApps }: { initialApps: Channel[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<Channel>>(new Set(initialApps));
  const [busy, setBusy] = useState(false);

  const toggle = (c: Channel) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const go = async () => {
    setBusy(true);
    await postJSON("/api/settings", { apps: [...picked] });
    router.push("/onboarding/clients");
  };

  return (
    <main className="app with-footer split">
      <section className="hero" style={{ paddingTop: "calc(var(--safe-top) + 44px)" }}>
        <h1 className="display welcome-title" style={{ fontSize: 38, lineHeight: "40px", fontWeight: 800, letterSpacing: -0.8 }}>
          Seven inboxes. One place.
        </h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: "22px", color: "rgba(255,255,255,0.78)" }}>
          Every client message from every app, sorted by who needs you. Replies stay yours.
        </p>
        <div aria-hidden="true" style={{ position: "relative", height: 196 }}>
          <svg width="100%" height="196" viewBox="0 0 350 196" preserveAspectRatio="xMidYMid meet" fill="none" style={{ position: "absolute", inset: 0 }}>
            <circle cx="175" cy="98" r="54" stroke="#8FA6FF" strokeOpacity="0.22" strokeWidth="2" />
            <circle cx="175" cy="98" r="84" stroke="#8FA6FF" strokeOpacity="0.12" strokeWidth="2" />
          </svg>
          <span style={{ position: "absolute", left: "50%", top: 66, transform: "translateX(-50%)", width: 64, height: 64, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--display)", fontSize: 22, fontWeight: 800, color: "var(--ink)", background: "#FFFFFF", boxShadow: "0 10px 26px rgba(143,166,255,0.35)" }}>
            <LogoMark size={48} variant="light" label="GainsTalk" />
          </span>
          {ALL_CHANNELS.map((c) => (
            <span key={c} className="pill" style={{ position: "absolute", height: 30, padding: "0 12px", borderRadius: 15, fontSize: 13, background: CHANNELS[c].tint, color: CHANNELS[c].ink, ...SPOTS[c] }}>
              {CHANNELS[c].label}
            </span>
          ))}
        </div>
      </section>

      <section className="pad stack" aria-labelledby="apps-h">
        <div className="stack-sm" style={{ padding: "0 4px" }}>
          <div className="steps" role="img" aria-label="Step 1 of 3">
            <span className="on" /><span /><span />
          </div>
          <h2 id="apps-h" className="h2" style={{ marginTop: 6 }}>Where do clients message you?</h2>
          <p className="lead">Pick every app you use. You can connect them after choosing your clients.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          {ALL_CHANNELS.map((c) => {
            const on = picked.has(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(c)}
                style={{ height: 56, padding: "0 12px", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 15, fontWeight: 700, background: on ? CHANNELS[c].tint : "#fff", border: on ? "2px solid var(--ink)" : "1px solid var(--line)" }}
              >
                {CHANNELS[c].label}
                <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", background: on ? "var(--ink)" : "#fff", border: on ? 0 : "2px solid #C3C5D3" }}>
                  {on && <Icon name="check" size={13} stroke={3.2} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="footer-bar">
        <div>
          <button className="btn btn-primary btn-big" disabled={picked.size === 0 || busy} onClick={go}>
            {picked.size === 0 ? "Pick at least one app" : `Continue with ${picked.size} ${picked.size === 1 ? "app" : "apps"}`}
          </button>
          <p className="small muted center" style={{ margin: 0 }}>Nothing is read until you choose your clients.</p>
        </div>
      </div>
    </main>
  );
}
