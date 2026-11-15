"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CHANNELS } from "@/lib/channels";
import type { Angle, Channel, Drafts } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Avatar, ChannelChip, Sidebar, Toast, copyAndOpen, postJSON, useToast } from "@/components/ui";

const ANGLES: { key: Angle; label: string; hint: string; tint: string; ink: string }[] = [
  { key: "soft", label: "Soft", hint: "Warm and easy", tint: "var(--mint-tint)", ink: "var(--mint-ink)" },
  { key: "mid", label: "Mid", hint: "Straight to the point", tint: "var(--peri-tint)", ink: "var(--peri-ink)" },
  { key: "firm", label: "Firm", hint: "Clear and direct", tint: "var(--coral-tint)", ink: "var(--coral-ink)" },
];

interface Props {
  messageId: string;
  mode: "reply" | "nudge";
  channel: Channel;
  client: { id: string; name: string; initials: string; avatar: string };
  thread: { id: string; direction: "in" | "out"; text: string; time: string; audioUrl: string | null }[];
  facts: { label: string; value: string; tint: string; ink: string }[];
  defaultAngle: Angle;
}

export default function ReplyClient(p: Props) {
  const router = useRouter();
  const first = p.client.name.split(" ")[0];
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const [angle, setAngle] = useState<Angle>(p.defaultAngle);
  const [edits, setEdits] = useState<Partial<Record<Angle, string>>>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();

  const load = async (refresh = false) => {
    setDrafts(null);
    const res = await postJSON<{ drafts: Drafts }>("/api/drafts", { messageId: p.messageId, mode: p.mode, refresh });
    if (res.drafts) {
      setDrafts(res.drafts);
      if (refresh) setEdits({});
    } else if (res.error) showToast(res.error);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const text = edits[angle] ?? drafts?.[angle] ?? "";

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const res = await postJSON<{ via: "api" | "manual"; openUrl?: string; error?: string; promise?: { text: string } | null }>(
      `/api/messages/${p.messageId}`,
      { action: "send", text }
    );
    setBusy(false);
    if (res.error && !res.via) return showToast(res.error);
    if (res.via === "manual") {
      await copyAndOpen(text, res.openUrl);
      showToast(res.openUrl ? "Copied. Paste it in the chat that just opened." : "Copied. Paste it in your chat.");
    }
    setSent(true);
    router.refresh();
  };

  return (
    <main className="app has-nav with-footer reply-page">
      <Sidebar />
      <Toast msg={toast} />
      <header className="hero" style={{ borderRadius: "0 0 28px 28px", gap: 12 }}>
        <Link href="/today" className="back-light"><Icon name="chevron-left" size={24} stroke={2.2} /> Today</Link>
        <div className="row">
          <Avatar initials={p.client.initials} color={p.client.avatar} size={52} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
            <h1 className="display" style={{ fontSize: 26, lineHeight: "30px", fontWeight: 700 }}>
              {p.mode === "nudge" ? `Check in with ${first}` : `Reply to ${first}`}
            </h1>
            <ChannelChip channel={p.channel} />
          </div>
        </div>
      </header>

      <div className="reply-grid">
      <div className="col">
      <section className="pad stack-sm" aria-label="Recent messages">
        {p.thread.map((m) => (
          <div key={m.id} className="stack-sm" style={{ gap: 4 }}>
            <span className="day" style={{ alignSelf: m.direction === "out" ? "flex-end" : "flex-start" }}>{m.time}</span>
            {m.audioUrl ? (
              <audio controls src={m.audioUrl} style={{ alignSelf: "flex-end", maxWidth: "80%" }} />
            ) : (
              <p className={`bubble ${m.direction}`}>{m.text}</p>
            )}
          </div>
        ))}
      </section>

      {p.facts.length > 0 && (
        <section className="pad stack-sm" aria-labelledby="facts-h">
          <h2 id="facts-h" className="label">What the drafts know</h2>
          <div className="mini-grid" style={{ gridTemplateColumns: `repeat(${p.facts.length}, minmax(0, 1fr))` }}>
            {p.facts.map((f) => (
              <div key={f.label} className="mini" style={{ background: f.tint }}>
                <b style={{ color: f.ink }}>{f.label}</b>
                {f.value}
              </div>
            ))}
          </div>
        </section>
      )}

      </div>

      <div className="col">
      <section className="pad stack" aria-labelledby="angle-h">
        <div className="row" style={{ justifyContent: "space-between", padding: "0 4px" }}>
          <h2 id="angle-h" className="h2" style={{ fontSize: 22 }}>Pick an angle</h2>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-pill sm btn-white" onClick={() => load(true)} aria-label="Write new drafts">
              <Icon name="refresh" size={15} stroke={2.2} />
            </button>
            <Link href="/onboarding/voice?from=reply" className="pill" style={{ height: 36, borderRadius: 18, gap: 6, padding: "0 12px", fontSize: 13, color: "var(--peri-ink)", background: "var(--peri-tint)" }}>
              <Icon name="sliders" size={14} stroke={2.2} /> Your style
            </Link>
          </div>
        </div>
        <div role="radiogroup" aria-label="Reply angle" className="stack-sm">
          {ANGLES.map((a) => (
            <button key={a.key} type="button" role="radio" aria-checked={angle === a.key} className="option" onClick={() => setAngle(a.key)}>
              <span className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                <span className="row" style={{ gap: 8 }}>
                  <span className="pill" style={{ height: 24, fontSize: 13, fontWeight: 800, color: a.ink, background: a.tint }}>{a.label}</span>
                  <span className="small muted">{a.hint}</span>
                </span>
                <span className="radio" aria-hidden="true" />
              </span>
              {drafts ? (
                <span style={{ fontSize: 15, lineHeight: "21px" }}>{edits[a.key] ?? drafts[a.key]}</span>
              ) : (
                <span className="stack-sm" style={{ width: "100%" }}>
                  <span className="skeleton" style={{ width: "92%" }} />
                  <span className="skeleton" style={{ width: "70%" }} />
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="pad">
        <div className="draft-box" style={{ borderRadius: 22, padding: 14 }}>
          <label htmlFor="reply" className="draft-label" style={{ fontSize: 14 }}>
            <Icon name="pencil" size={15} stroke={2.2} /> Add your own touch
          </label>
          <textarea
            id="reply"
            className="textarea"
            rows={4}
            value={text}
            disabled={!drafts}
            onChange={(e) => setEdits({ ...edits, [angle]: e.target.value })}
            style={{ boxShadow: "none" }}
          />
        </div>
      </section>

      <div className="footer-bar">
        <div>
          {sent ? (
            <>
              <div role="status" className="btn btn-big btn-mint" style={{ cursor: "default" }}>
                <Icon name="check" stroke={2.6} /> Done with {first}
              </div>
              <Link href="/today" className="btn btn-big" style={{ background: "transparent", color: "var(--primary)", height: 44 }}>Back to Today</Link>
            </>
          ) : (
            <>
              <div className="row" style={{ gap: 8 }}>
                <Link href={`/voice-note/${p.messageId}${p.mode === "nudge" ? "?mode=nudge" : ""}`} className="btn btn-voice grow" style={{ height: 56, borderRadius: 18 }}>
                  <Icon name="mic" size={19} /> Voice note
                </Link>
                <button className="btn btn-primary" style={{ flex: 1.3, height: 56, borderRadius: 18 }} onClick={send} disabled={!text.trim() || busy}>
                  <Icon name="send" size={19} stroke={2.2} /> Send text
                </button>
              </div>
              <p className="small muted center" style={{ margin: 0 }}>
                {CHANNELS[p.channel].label}. Nothing goes out without your OK.
              </p>
            </>
          )}
        </div>
      </div>
      </div>
      </div>
    </main>
  );
}
