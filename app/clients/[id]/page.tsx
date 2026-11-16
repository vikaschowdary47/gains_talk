import LiveRefresh from "@/components/LiveRefresh";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readDB } from "@/lib/store";
import { timeLabel } from "@/lib/util";
import { CHANNELS } from "@/lib/channels";
import { Icon, Rings } from "@/components/Icon";
import { Avatar, ChannelChip, ChannelIcon, Sidebar } from "@/components/ui";
import RemoveClient from "./RemoveClient";
import { statSummary } from "@/lib/stats";
import type { Stat } from "@/lib/types";

/** A tiny trend line for a stat. */
function Spark({ points }: { points: Stat[] }) {
  if (points.length < 2) return null;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const d = vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${28 - ((v - min) / span) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: "100%", height: 34 }} aria-hidden="true">
      <polyline points={d} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDB();
  const c = db.contacts.find((x) => x.id === id && x.isClient);
  if (!c) notFound();

  const msgs = db.messages.filter((m) => m.clientId === c.id).sort((a, b) => b.at.localeCompare(a.at));
  const waiting = msgs.find((m) => m.status === "needs_reply");
  const lastIn = msgs.find((m) => m.direction === "in");
  const promises = db.promises.filter((p) => p.clientId === c.id).sort((a, b) => Number(a.done) - Number(b.done));
  const channels = [...new Set([...c.handles.map((h) => h.channel), ...msgs.map((m) => m.channel)])];
  const recentIn = msgs.filter((m) => m.direction === "in").slice(0, 3);
  const stats = statSummary(c.stats);
  const messageHref = waiting ? `/reply/${waiting.id}` : lastIn ? `/reply/${lastIn.id}?mode=nudge` : null;

  return (
    <main className="app has-nav" style={{ paddingBottom: 48 }}>
      <LiveRefresh />
      <Sidebar />
      <header className="hero" style={{ paddingBottom: c.nextSession ? 76 : 24 }}>
        <Rings color="#7BE0B8" />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <Link href="/clients" className="back-light"><Icon name="chevron-left" size={24} stroke={2.2} /> Clients</Link>
          {messageHref && (
            <Link href={messageHref} className="btn btn-pill btn-peri" style={{ height: 40 }}>
              <Icon name="chat" size={16} stroke={2.4} /> {waiting ? "Reply" : "Check in"}
            </Link>
          )}
        </div>
        <div className="row" style={{ gap: 14 }}>
          <Avatar initials={c.initials} color={c.avatar} size={72} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h1 className="display" style={{ fontSize: 30, lineHeight: "32px", fontWeight: 800 }}>{c.name}</h1>
            {c.since && <span className="hero-sub" style={{ fontWeight: 500 }}>Client since {c.since}</span>}
            <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
              {channels.map((ch) => <ChannelChip key={ch} channel={ch} />)}
            </div>
          </div>
        </div>
      </header>

      <div className="profile-grid">
      <div className="col">
      {c.nextSession && (
        <section aria-label="Next session" className="card session-card" style={{ margin: "-76px 16px 0", position: "relative", background: "var(--mint)", boxShadow: "0 14px 30px rgba(22,24,58,0.18)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Next session</span>
            <span className="display" style={{ fontSize: 22, fontWeight: 700 }}>{c.nextSession.when}</span>
            <span style={{ fontSize: 14 }}>{c.nextSession.topic}</span>
          </div>
          <details style={{ background: "#fff", borderRadius: 16, padding: "12px 14px" }} open>
            <summary style={{ fontWeight: 700, cursor: "pointer", minHeight: 24 }}>Prep brief</summary>
            <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {recentIn.map((m, i) => (
                <li key={m.id} style={{ display: "flex", gap: 10, fontSize: 15, lineHeight: "21px" }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, flex: "none", marginTop: 7, borderRadius: 4, background: ["var(--primary)", "#D9481F", "#2FBF8A"][i % 3] }} />
                  <span>{m.text} <span className="muted small">({timeLabel(m.at)})</span></span>
                </li>
              ))}
              {promises.filter((p) => !p.done).map((p) => (
                <li key={p.id} style={{ display: "flex", gap: 10, fontSize: 15, lineHeight: "21px" }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, flex: "none", marginTop: 7, borderRadius: 4, background: "#E0A800" }} />
                  <span>You promised: {p.text}{p.due ? ` by ${p.due}` : ""}</span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      <section className="pad stack-sm" aria-labelledby="stats">
        <h2 id="stats" className="h2" style={{ fontSize: 22, margin: "0 4px" }}>Stats</h2>
        {stats.length === 0 ? (
          <p className="small muted" style={{ margin: "0 4px" }}>When {c.name.split(" ")[0]} mentions a number like their weight, steps or a lift, it&apos;s logged here automatically.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {stats.map((st) => (
              <div key={st.kind} className="card" style={{ gap: 4, borderRadius: 20, padding: 14 }}>
                <span className="small muted" style={{ fontWeight: 600 }}>{st.label}</span>
                <span className="display" style={{ fontSize: 24, fontWeight: 800 }}>
                  {st.latest.value}<span style={{ fontSize: 14, fontWeight: 600, marginLeft: 3 }}>{st.latest.unit}</span>
                </span>
                {st.change !== null && st.change !== 0 && (
                  <span className="small" style={{ fontWeight: 600 }}>
                    {st.change > 0 ? "Up" : "Down"} {Math.abs(st.change)} {st.latest.unit} since {new Date(st.points[0].at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                <Spark points={st.points} />
                <span className="small muted">Last logged {timeLabel(st.latest.at)}{st.points.length > 1 ? `, ${st.points.length} entries` : ""}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {c.goals.length > 0 && (
        <section className="pad stack-sm" aria-labelledby="goals">
          <h2 id="goals" className="h2" style={{ fontSize: 22, margin: "0 4px" }}>Goals</h2>
          {c.goals.map((g) => (
            <div key={g.id} className="card" style={{ gap: 10, borderRadius: 20 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{g.title}</span>
                {g.target && <span style={{ fontSize: 14, fontWeight: 600, color: "var(--mint-ink)", flex: "none" }}>{g.target}</span>}
              </div>
              {typeof g.progress === "number" && (
                <div className="progress" role="progressbar" aria-label={`${g.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(g.progress * 100)}>
                  <span style={{ width: `${Math.round(g.progress * 100)}%` }} />
                </div>
              )}
              {g.progressLabel && <span className="small muted">{g.progressLabel}</span>}
            </div>
          ))}
        </section>
      )}

      {promises.length > 0 && (
        <section className="pad stack-sm" aria-labelledby="promises">
          <h2 id="promises" className="h2" style={{ fontSize: 22, margin: "0 4px" }}>Your promises</h2>
          {promises.map((p) => (
            <div key={p.id} className="list-item" style={{ background: p.done ? "#fff" : "var(--amber-tint)" }}>
              <span className="avatar" style={{ width: 40, height: 40, borderRadius: 12, background: p.done ? "var(--mint-tint)" : "var(--amber)", color: p.done ? "var(--mint-ink)" : "var(--ink)" }}>
                <Icon name={p.done ? "check" : "clock"} size={20} stroke={2.2} />
              </span>
              <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: 16, fontWeight: p.done ? 600 : 700, color: p.done ? "var(--muted)" : "var(--ink)", textDecoration: p.done ? "line-through" : "none" }}>{p.text}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: p.done ? "var(--muted)" : "var(--amber-ink)" }}>{p.done ? "Done" : p.due ? `Due ${p.due}` : "Open"}</span>
              </span>
            </div>
          ))}
        </section>
      )}

      </div>

      <div className="col">
      <section className="pad stack-sm" aria-labelledby="activity">
        <h2 id="activity" className="h2" style={{ fontSize: 22, margin: "0 4px" }}>Every channel, one timeline</h2>
        <ul className="list">
          {msgs.slice(0, 12).map((m) => (
            <li key={m.id} className="list-item" style={{ alignItems: "flex-start" }}>
              <ChannelIcon channel={m.channel} size={34} />
              <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span className="row small" style={{ justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{m.direction === "in" ? c.name.split(" ")[0] : "You"} on {CHANNELS[m.channel].label}</span>
                  <span className="muted">{timeLabel(m.at)}</span>
                </span>
                {m.audioUrl ? <audio controls src={m.audioUrl} style={{ width: "100%" }} /> : <span style={{ fontSize: 15, lineHeight: "21px" }}>{m.text}</span>}
                {m.direction === "out" && m.sentVia === "api" && m.sendError && <span className="send-note bad">{m.sendError}</span>}
                {m.direction === "out" && m.sentVia === "manual" && (
                  <span className="send-note bad">{m.sendError ?? `Copied for you to send in ${CHANNELS[m.channel].label}. GainsTalk didn't send this one.`}</span>
                )}
                {m.direction === "out" && m.sentVia === "demo" && <span className="send-note">Sample client, so nothing was sent.</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="pad" aria-label="Remove client">
        <RemoveClient id={c.id} name={c.name} />
      </section>
      </div>
      </div>
    </main>
  );
}
