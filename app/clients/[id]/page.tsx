import LiveRefresh from "@/components/LiveRefresh";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readDB } from "@/lib/store";
import { timeLabel, firstName } from "@/lib/util";
import { CHANNELS } from "@/lib/channels";
import { Icon, Rings } from "@/components/Icon";
import { Avatar, ChannelChip, ChannelIcon, Sidebar } from "@/components/ui";
import RemoveClient from "./RemoveClient";
import CatchUp from "./CatchUp";
import { clientGlance } from "@/lib/glance";
import { igIdsOf } from "@/lib/ig-history";
import { currentBrief } from "@/lib/brief";
import { statSummary } from "@/lib/stats";
import type { Stat } from "@/lib/types";

const num = (n: number) => (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en-US") : String(Math.round(n * 10) / 10));
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** A clean line chart for one stat: start and end values, first and last dates. */
function StatChart({ points, unit, label }: { points: Stat[]; unit: string; label: string }) {
  if (points.length < 2) return null;
  const W = 320, H = 110, L = 8, R = 8, T = 14, B = 14;
  const vals = points.map((p) => p.value);
  const times = points.map((p) => Date.parse(p.at));
  const min = Math.min(...vals), max = Math.max(...vals);
  // Keep a sensible scale so tiny changes look small (e.g. 0.4 lb on a weight chart).
  const floor = Math.abs(max) * (unit === "lb" || unit === "kg" ? 0.02 : 0.15);
  const span = Math.max(max - min, floor, 1);
  const mid = (max + min) / 2;
  const lo = mid - span / 2;
  const t0 = times[0], tspan = times[times.length - 1] - t0 || 1;
  const xy = points.map((p, i) => [L + ((times[i] - t0) / tspan) * (W - L - R), T + (1 - (p.value - lo) / span) * (H - T - B)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = xy[xy.length - 1];
  return (
    <figure style={{ margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label={`${label} from ${points[0].value} ${unit} on ${shortDate(points[0].at)} to ${points[points.length - 1].value} ${unit} on ${shortDate(points[points.length - 1].at)}`}>
        <line x1={L} x2={W - R} y1={T} y2={T} stroke="#E7E8F1" strokeWidth="1" />
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#E7E8F1" strokeWidth="1" />
        <path d={d} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === xy.length - 1 ? 4.5 : 3} fill={i === xy.length - 1 ? "var(--primary)" : "#fff"} stroke="var(--primary)" strokeWidth="2" />)}
        <circle cx={last[0]} cy={last[1]} r="9" fill="var(--primary)" opacity="0.12" />
      </svg>
      <figcaption className="row small muted" style={{ justifyContent: "space-between" }}>
        <span>{shortDate(points[0].at)}: {num(points[0].value)} {unit}</span>
        <span>{shortDate(points[points.length - 1].at)}: {num(points[points.length - 1].value)} {unit}</span>
      </figcaption>
    </figure>
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
  const thread = msgs.slice(0, 20).reverse(); // oldest first, like a chat
  const tz = db.settings.timeZone || "America/Chicago";
  const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: tz });
  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    if (dayKey(d) === dayKey(new Date())) return "Today";
    if (dayKey(d) === dayKey(new Date(Date.now() - 86_400_000))) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: tz });
  };
  const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
  const g = clientGlance(db, c);
  const first = firstName(c.name);
  const hasInstagram = igIdsOf(c.handles).length > 0;
  const brief = currentBrief(db, c);
  const badge = { "check-in": ["Needs a check-in", "#FFF3D6", "#5A3E00"], "on-track": ["On track", "#DDF4E8", "#15603C"], steady: ["Steady", "#E7E8F1", "#2E3352"], new: ["Getting started", "#E7E8F1", "#2E3352"] }[brief.status];
  const tone = { warn: "#A8410F", good: "#15603C", info: "var(--muted)" } as const;
  const nudgeHref = lastIn ? `/reply/${lastIn.id}?mode=nudge` : null;
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
      <section className="pad stack-sm" aria-labelledby="brief">
        <div className="card" style={{ gap: 14, borderRadius: 20 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 id="brief" className="h2" style={{ fontSize: 20, margin: 0 }}>{first}&apos;s brief</h2>
            <span style={{ fontSize: 13, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: badge[1], color: badge[2] }}>{badge[0]}</span>
          </div>
          <p style={{ margin: 0, fontSize: 16, lineHeight: "24px" }}>{brief.text}</p>
          {brief.signals.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {brief.signals.slice(0, 6).map((sg) => (
                <div key={sg.key} style={{ background: "var(--bg, #F4F4F8)", borderRadius: 14, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span className="small muted">{sg.label}</span>
                  <span style={{ fontSize: 19, fontWeight: 800 }}>{sg.value}</span>
                  <span className="small" style={{ fontWeight: 600, color: tone[sg.level] }}>{sg.detail}</span>
                </div>
              ))}
            </div>
          )}
          {brief.quotes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>What {first} said</span>
              {brief.quotes.map((q) => (
                <p key={q.at} className="small" style={{ margin: 0, lineHeight: "20px", color: "var(--muted)" }}>&ldquo;{q.text}&rdquo; ({timeLabel(q.at)})</p>
              ))}
            </div>
          )}
          {nudgeHref && brief.status === "check-in" && !waiting && (
            <Link href={nudgeHref} className="btn btn-primary btn-pill" style={{ alignSelf: "flex-start" }}>Draft a check-in</Link>
          )}
          <span className="small muted">
            Based on {brief.basis.messages} {brief.basis.messages === 1 ? "message" : "messages"} and {brief.basis.numbers} {brief.basis.numbers === 1 ? "number" : "numbers"} {first} shared. GainsTalk only knows what {first} told you.
          </span>
        </div>
      </section>

      <section className="pad stack-sm" aria-labelledby="glance">
        <h2 id="glance" className="h2" style={{ fontSize: 22, margin: "0 4px" }}>At a glance</h2>
        <div className="card" style={{ gap: 0, borderRadius: 20, padding: "6px 16px" }}>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", columnGap: 0 }}>
            {[
              ["Waiting on your reply", g.waiting ? `Yes, for ${g.waiting}` : "No"],
              ["Their last message", g.lastIn ? `${g.lastIn.ago} ago` : "None yet"],
              ["Messages this week", `${g.theirWeek} from ${first}, ${g.yourWeek} from you`],
              ["You usually reply in", g.replyTime ?? "Not enough messages yet"],
            ].map(([k, v], i) => (
              <div key={k} style={{ display: "contents" }}>
                <dt style={{ padding: "12px 0", fontSize: 15, color: "var(--muted)", borderTop: i ? "1px solid #EEEFF5" : "none" }}>{k}</dt>
                <dd style={{ margin: 0, padding: "12px 0 12px 12px", fontSize: 15, fontWeight: 700, textAlign: "right", borderTop: i ? "1px solid #EEEFF5" : "none", color: k === "Waiting on your reply" && g.waiting ? "#A8410F" : "var(--ink)" }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        {g.lastIn && g.lastIn.quietDays >= 7 && !g.waiting && (
          <p className="notice amber" style={{ margin: 0 }}>{first} hasn&apos;t messaged in {g.lastIn.quietDays} days. A quick check-in could help.</p>
        )}
      </section>

      <section className="pad stack-sm" aria-labelledby="about">
        <h2 id="about" className="h2" style={{ fontSize: 22, margin: "0 4px" }}>About {first}</h2>
        <div className="card" style={{ gap: 12, borderRadius: 20 }}>
          {c.about?.summary || c.about?.facts.length ? (
            <>
              {c.about.summary && <p style={{ margin: 0, fontSize: 16, lineHeight: "24px" }}>{c.about.summary}</p>}
              {c.about.facts.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: 15, lineHeight: "21px" }}>
                  {c.about.facts.map((f) => <li key={f}>{f}</li>)}
                </ul>
              )}
              <span className="small muted">Written by GainsTalk from your chats, {timeLabel(c.about.updatedAt).toLowerCase()}. Check anything important with {first}.</span>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 15, lineHeight: "22px", color: "var(--muted)" }}>
              {c.about ? `Not enough to go on yet. Once ${first} talks about goals, training, food or how their week is going, notes will appear here.` : `Nothing here yet. GainsTalk can read ${first}'s messages and note their goals, injuries, schedule and preferences.`}
            </p>
          )}
          <CatchUp id={c.id} hasInstagram={hasInstagram} />
        </div>
      </section>

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
          <p className="small muted" style={{ margin: "0 4px" }}>When {first} mentions a number like their weight, steps or a lift, it&apos;s logged here with a chart.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {stats.map((st) => (
              <div key={st.kind} className="card" style={{ gap: 8, borderRadius: 20, padding: 16 }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{st.label}</span>
                  <span className="small muted">{timeLabel(st.latest.at)}</span>
                </div>
                <span className="display" style={{ fontSize: 30, fontWeight: 800, lineHeight: "34px" }}>
                  {num(st.latest.value)}<span style={{ fontSize: 15, fontWeight: 600, marginLeft: 4 }}>{st.latest.unit}</span>
                </span>
                {st.change !== null && st.change !== 0 ? (
                  <span style={{ fontSize: 15, fontWeight: 600 }}>
                    {st.change > 0 ? "Up" : "Down"} {num(Math.abs(st.change))} {st.latest.unit} since {shortDate(st.points[0].at)}
                  </span>
                ) : (
                  <span className="small muted">{st.points.length > 1 ? "No change yet" : "Logged once so far"}</span>
                )}
                <StatChart points={st.points} unit={st.latest.unit} label={st.label} />
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
        <h2 id="activity" className="h2" style={{ fontSize: 22, margin: "0 4px" }}>Conversation</h2>
        {thread.length === 0 ? (
          <p className="small muted" style={{ margin: "0 4px" }}>No messages yet.</p>
        ) : (
          <div className="card" style={{ gap: 6, borderRadius: 20, padding: "14px 12px" }}>
            {msgs.length > thread.length && <p className="small muted center" style={{ margin: "0 0 4px" }}>Showing the last {thread.length} of {msgs.length} messages</p>}
            {thread.map((m, i) => {
              const day = dayLabel(m.at);
              const showDay = i === 0 || dayLabel(thread[i - 1].at) !== day;
              const mine = m.direction === "out";
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {showDay && <p className="small muted center" style={{ margin: "10px 0 4px", fontWeight: 600 }}>{day}</p>}
                  <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "82%", display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 3 }}>
                      <div style={{ background: mine ? "var(--primary)" : "#EEEFF5", color: mine ? "#fff" : "var(--ink)", padding: "9px 13px", borderRadius: 18, borderBottomRightRadius: mine ? 6 : 18, borderBottomLeftRadius: mine ? 18 : 6, fontSize: 15, lineHeight: "21px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                        {m.audioUrl ? <audio controls src={m.audioUrl} style={{ width: 220 }} /> : m.text}
                      </div>
                      <span className="small muted" style={{ fontSize: 12 }}>
                        {mine ? "You" : first}, {clock(m.at)}{m.channel !== "instagram" || c.handles.some((h) => h.channel !== "instagram") ? ` on ${CHANNELS[m.channel].label}` : ""}
                      </span>
                      {mine && m.sentVia === "api" && m.sendError && <span className="send-note bad">{m.sendError}</span>}
                      {mine && m.sentVia === "manual" && <span className="send-note bad">{m.sendError ?? `Copied for you to send in ${CHANNELS[m.channel].label}. GainsTalk didn't send this one.`}</span>}
                      {mine && m.sentVia === "demo" && <span className="send-note">Demo client, so nothing was sent.</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="pad" aria-label="Remove client">
        <RemoveClient id={c.id} name={c.name} />
      </section>
      </div>
      </div>
    </main>
  );
}
