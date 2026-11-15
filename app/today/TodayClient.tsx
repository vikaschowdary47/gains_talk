"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Angle, Channel, Drafts } from "@/lib/types";
import { CHANNELS } from "@/lib/channels";
import { Icon, Rings } from "@/components/Icon";
import { LogoMark } from "@/components/Logo";
import { Avatar, ChannelChip, TabBar, Toast, copyAndOpen, postJSON, useToast } from "@/components/ui";

interface QueueItem {
  id: string;
  text: string;
  time: string;
  channel: Channel;
  client: { id: string; name: string; initials: string; avatar: string };
  context: string | null;
}
interface Quiet { id: string; name: string; initials: string; avatar: string; days: number; lastMessageId: string | null }
interface PromiseItem { id: string; text: string; due: string | null; clientId: string }
interface Session { id: string; name: string; when: string; topic: string }
interface PendingPerson { id: string; name: string; channel: Channel; handle: string; seen: string }

type Tab = "replies" | "quiet" | "promises";

export default function TodayClient(props: {
  coachName: string;
  today: string;
  queue: QueueItem[];
  quiet: Quiet[];
  promises: PromiseItem[];
  sessions: Session[];
  pending: PendingPerson[];
  clients: { id: string; name: string }[];
  defaultAngle: Angle;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("replies");
  const [queue, setQueue] = useState(props.queue);
  const [selectedId, setSelectedId] = useState<string | null>(props.queue[0]?.id ?? null);
  const [angle, setAngle] = useState<Angle>(props.defaultAngle);
  const [drafts, setDrafts] = useState<Record<string, Drafts>>({});
  const [busy, setBusy] = useState(false);
  const [promises, setPromises] = useState(props.promises);
  const [pending, setPending] = useState(props.pending);
  const [toast, showToast] = useToast();

  const current = queue.find((q) => q.id === selectedId) ?? queue[0];
  const currentIdx = current ? queue.indexOf(current) : -1;
  const d = current ? drafts[current.id] : undefined;

  const inflight = useRef<Set<string>>(new Set());
  const load = useCallback(
    (id: string) => {
      if (inflight.current.has(id)) return;
      inflight.current.add(id);
      postJSON<{ drafts: Drafts }>("/api/drafts", { messageId: id }).then((res) => {
        inflight.current.delete(id);
        if (res.drafts) setDrafts((prev) => ({ ...prev, [id]: res.drafts }));
        else if (res.error) showToast(res.error);
      });
    },
    [showToast]
  );

  useEffect(() => {
    if (current && !drafts[current.id]) load(current.id);
    const next = queue[currentIdx + 1];
    if (next && !drafts[next.id]) load(next.id); // warm up the next card
  }, [current, currentIdx, queue, drafts, load]);

  const select = (id: string) => {
    setSelectedId(id);
    setAngle(props.defaultAngle);
  };

  const advance = () => {
    if (!current) return;
    const rest = queue.filter((q) => q.id !== current.id);
    setQueue(rest);
    setSelectedId(rest[Math.min(currentIdx, rest.length - 1)]?.id ?? null);
    setAngle(props.defaultAngle);
  };

  const skip = async () => {
    if (!current) return;
    await postJSON(`/api/messages/${current.id}`, { action: "skip" });
    advance();
  };

  const send = async () => {
    if (!current || !d) return;
    setBusy(true);
    const text = d[angle];
    const res = await postJSON<{ via: "api" | "manual" | "demo"; openUrl?: string; error?: string; promise?: { text: string } | null }>(
      `/api/messages/${current.id}`,
      { action: "send", text }
    );
    setBusy(false);
    if (res.error && !res.via) return showToast(res.error);
    if (res.via === "manual") {
      await copyAndOpen(text, res.openUrl);
      showToast(res.error ?? (res.openUrl ? "Reply copied. Paste it in the chat that just opened." : "Reply copied. Paste it in your chat."));
    } else if (res.via === "demo") {
      showToast(`Sample client, so nothing was sent. Marked as replied.`);
    } else {
      showToast(`Sent to ${current.client.name.split(" ")[0]}`);
    }
    if (res.promise) setTimeout(() => showToast(`Added to promises: ${res.promise!.text}`), 1600);
    advance();
    router.refresh();
  };

  const togglePromise = async (id: string) => {
    await postJSON("/api/promises", { id, done: true });
    setPromises((p) => p.filter((x) => x.id !== id));
    showToast("Marked done. Nice follow-through.");
  };

  const decide = async (p: PendingPerson, add: boolean) => {
    await postJSON("/api/settings", add ? { addPending: p.id } : { dismissPending: p.id });
    setPending((list) => list.filter((x) => x.id !== p.id));
    showToast(add ? `${p.name} is now a client. Their next message lands here.` : `Got it. Messages from ${p.name} stay private.`);
    router.refresh();
  };

  /** The account belongs to someone already on the client list. */
  const link = async (p: PendingPerson, clientId: string) => {
    const client = props.clients.find((c) => c.id === clientId);
    if (!client) return;
    await postJSON("/api/settings", { linkPending: { id: p.id, clientId } });
    setPending((list) => list.filter((x) => x.id !== p.id));
    showToast(`Linked to ${client.name}. Their next ${CHANNELS[p.channel].label} message lands here.`);
    router.refresh();
  };

  const tiles: { key: Tab; count: number; label: string; cls: string; icon: "send" | "chat" | "clock" }[] = [
    { key: "replies", count: queue.length, label: queue.length === 1 ? "reply ready" : "replies ready", cls: "t-replies", icon: "send" },
    { key: "quiet", count: props.quiet.length, label: "gone quiet", cls: "t-quiet", icon: "chat" },
    { key: "promises", count: promises.length, label: promises.length === 1 ? "promise due" : "promises due", cls: "t-promises", icon: "clock" },
  ];

  /** The reply card. On phones it sits on a stack of upcoming cards. */
  const card = (stacked: boolean) =>
    current ? (
      <div className={stacked ? "stack-wrap" : undefined}>
        {stacked && queue.length > 2 && <div className="back2" aria-hidden="true" />}
        {stacked && queue.length > 1 && <div className="back1" aria-hidden="true" />}
        <article className="card raised" aria-label={`Reply to ${current.client.name}`}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <Link href={`/clients/${current.client.id}`} className="row grow" style={{ color: "var(--ink)" }}>
              <Avatar initials={current.client.initials} color={current.client.avatar} />
              <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{current.client.name}</span>
                <span className="row" style={{ gap: 8 }}>
                  <ChannelChip channel={current.channel} />
                  <span className="small muted">{current.time}</span>
                </span>
              </span>
            </Link>
            {!stacked && <span className="count-pill">{currentIdx + 1} of {queue.length}</span>}
          </div>

          <p className="bubble in grey">{current.text}</p>

          <div className="draft-box">
            <span className="draft-label"><Icon name="pencil" size={14} stroke={2.2} /> Written the way you text</span>
            <div className="seg" role="group" aria-label="Reply angle">
              {(["soft", "mid", "firm"] as Angle[]).map((a) => (
                <button key={a} type="button" aria-pressed={angle === a} onClick={() => setAngle(a)} style={{ textTransform: "capitalize" }}>
                  {a}
                </button>
              ))}
            </div>
            {!d ? (
              <div className="stack-sm" aria-label="Writing drafts">
                <div className="skeleton" style={{ width: "95%" }} />
                <div className="skeleton" style={{ width: "80%" }} />
                <div className="skeleton" style={{ width: "60%" }} />
              </div>
            ) : (
              <p className="draft-text">{d[angle]}</p>
            )}
          </div>

          {current.context && (
            <span className="pill" style={{ alignSelf: "flex-start", height: "auto", minHeight: 28, padding: "5px 10px", fontSize: 13, fontWeight: 600, color: "var(--mint-ink)", background: "var(--mint-tint)" }}>
              {current.context}
            </span>
          )}

          <div className="row" style={{ gap: 8 }}>
            <button className="btn" style={{ width: 64, padding: 0, fontSize: 15 }} onClick={skip}>Skip</button>
            <Link href={`/voice-note/${current.id}`} className="btn btn-icon btn-voice" aria-label="Record a voice note instead"><Icon name="mic" /></Link>
            <Link href={`/reply/${current.id}`} className="btn btn-icon" aria-label="Edit the draft"><Icon name="pencil" /></Link>
            <button className="btn btn-primary grow" onClick={send} disabled={!d || busy}>
              <Icon name="send" size={18} stroke={2.2} /> Send
            </button>
          </div>
        </article>
      </div>
    ) : (
      <div className="card center" style={{ alignItems: "center", padding: "28px 22px" }}>
        <span className="avatar" style={{ width: 56, height: 56, background: "var(--mint)" }}><Icon name="check" size={28} stroke={2.4} /></span>
        <h3 className="display" style={{ fontSize: 22, fontWeight: 700 }}>Every reply is sent</h3>
        <p className="lead" style={{ maxWidth: 280 }}>New drafts show up here as clients write in.</p>
        <Link href="/add" className="btn btn-pill btn-white">Add a message by hand</Link>
      </div>
    );

  const sessions = (
    props.sessions.length > 0 && (
      <section className="stack" aria-label="Coming up">
        <h2 className="h2 coming-h">Coming up</h2>
        <div className="sessions">
          {props.sessions.map((s, i) => (
            <Link key={s.id} href={`/clients/${s.id}`} className={`session${i === 0 ? " next" : ""}`}>
              <span style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? "var(--ink)" : "var(--mint-ink)" }}>{i === 0 ? `Next, ${s.when}` : s.when}</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span className="display" style={{ fontSize: 20, fontWeight: 700 }}>{s.name}</span>
                <span style={{ fontSize: 14, color: i === 0 ? "var(--ink)" : "var(--muted)" }}>{s.topic}</span>
              </span>
              <span className="pill" style={{ alignSelf: "flex-start", height: 32, borderRadius: 16, padding: "0 12px", fontSize: 13, color: i === 0 ? "#fff" : "var(--mint-ink)", background: i === 0 ? "var(--navy)" : "var(--mint-tint)" }}>
                Open brief
              </span>
            </Link>
          ))}
        </div>
      </section>
    )
  );

  return (
    <main className="app has-nav">
      <Toast msg={toast} />
      <section className="hero">
        <Rings />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="row" style={{ gap: 10 }}><span className="mobile-only" style={{ display: "inline-flex" }}><LogoMark size={30} label="GainsTalk" /></span><span className="hero-sub">{props.today}</span></span>
          <span className="row mobile-only" style={{ gap: 8 }}>
            <Link href="/add" aria-label="Add a message by hand" className="avatar" style={{ width: 44, height: 44, background: "rgba(255,255,255,0.12)", color: "#fff" }}>
              <Icon name="plus" size={22} stroke={2.4} />
            </Link>
            <Link href="/channels" aria-label="Channels and settings" className="avatar" style={{ width: 44, height: 44, background: "var(--peri)", fontSize: 16 }}>
              {props.coachName.slice(0, 1).toUpperCase()}
            </Link>
          </span>
        </div>
        <h1 className="display" style={{ fontSize: 31, lineHeight: "35px", fontWeight: 700 }}>
          Morning, {props.coachName}. Here&apos;s your game plan.
        </h1>
        <div className="tiles" role="group" aria-label="Today's tasks">
          {tiles.map((t) => (
            <button key={t.key} type="button" className={`tile ${t.cls}`} aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>
              <span className="ico"><Icon name={t.icon} size={17} stroke={2.2} /></span>
              <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span className="num">{t.count}</span>
                <span className="lbl">{t.label}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="today-grid">
        <div className="stack" style={{ gap: 22 }}>
          {pending.length > 0 && (
            <section className="pad" aria-labelledby="new-h">
              <div className="card stack" style={{ gap: 12 }}>
                <div className="stack-sm" style={{ gap: 2 }}>
                  <h2 id="new-h" className="h2" style={{ fontSize: 19 }}>New people messaged you</h2>
                  <p className="small muted" style={{ margin: 0 }}>Only their name and handle were kept, not the message. Add the ones who are clients, or link them if a client wrote from a new account.</p>
                </div>
                <ul className="stack-sm pending-list" style={{ listStyle: "none", margin: 0, padding: 0, gap: 12 }}>
                  {pending.map((p) => (
                    <li key={p.id} className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                      <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                        <span className="row" style={{ gap: 6 }}><ChannelChip channel={p.channel} /><span className="small muted">{p.seen}</span></span>
                      </span>
                      <span className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <button type="button" className="btn btn-pill sm" onClick={() => decide(p, false)}>Not a client</button>
                        {props.clients.length > 0 && (
                          <select
                            className="select pending-link"
                            aria-label={`${p.name} is an existing client`}
                            value=""
                            onChange={(e) => e.target.value && link(p, e.target.value)}
                          >
                            <option value="">Existing client…</option>
                            {props.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        )}
                        <button type="button" className="btn btn-pill sm btn-primary" onClick={() => decide(p, true)}>Add as new client</button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
          {tab === "replies" && (
            <section className="pad stack" aria-labelledby="replies-h">
              <div className="row" style={{ justifyContent: "space-between", padding: "0 4px" }}>
                <h2 id="replies-h" className="h2">Replies ready</h2>
                {queue.length > 0 && <span className="count-pill">{queue.length} left</span>}
              </div>
              {/* Desktop: pick any message from the list. */}
              {queue.length > 0 && (
                <ul className="queue desk-only">
                  {queue.map((q) => (
                    <li key={q.id}>
                      <button type="button" className="queue-item" aria-current={q.id === current?.id} onClick={() => select(q.id)}>
                        <Avatar initials={q.client.initials} color={q.client.avatar} size={40} />
                        <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700 }}>{q.client.name}</span>
                            <span className="small muted" style={{ flex: "none" }}>{q.time}</span>
                          </span>
                          <span className="preview">{q.text}</span>
                          <ChannelChip channel={q.channel} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {/* Phone: one card at a time. */}
              <div className="mobile-only">{card(true)}</div>
              {queue.length === 0 && <div className="desk-only"><p className="lead">You&apos;re all caught up.</p></div>}
            </section>
          )}

          {tab === "quiet" && (
            <section className="pad stack" aria-labelledby="quiet-h">
              <div className="stack-sm" style={{ padding: "0 4px", gap: 2 }}>
                <h2 id="quiet-h" className="h2">Gone quiet</h2>
                <p className="lead">A short check-in now keeps them from drifting.</p>
              </div>
              {props.quiet.length === 0 ? (
                <p className="lead center">Everyone has been in touch this week.</p>
              ) : (
                <ul className="list">
                  {props.quiet.map((q) => (
                    <li key={q.id} className="list-item">
                      <Avatar initials={q.initials} color={q.avatar} size={46} />
                      <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{q.name}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--coral-ink)" }}>{q.days} days since last message</span>
                      </span>
                      {q.lastMessageId && (
                        <Link href={`/reply/${q.lastMessageId}?mode=nudge`} className="btn btn-pill btn-coral">Nudge</Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {tab === "promises" && (
            <section className="pad stack" aria-labelledby="promise-h">
              <div className="stack-sm" style={{ padding: "0 4px", gap: 2 }}>
                <h2 id="promise-h" className="h2">Promises due</h2>
                <p className="lead">Things you told clients you&apos;d do, caught from your own replies.</p>
              </div>
              {promises.length === 0 ? (
                <p className="lead center">Nothing owed. Nice.</p>
              ) : (
                <ul className="list">
                  {promises.map((p) => (
                    <li key={p.id} className="list-item">
                      <span className="avatar" style={{ width: 46, height: 46, borderRadius: 14, background: "var(--amber)" }}><Icon name="clock" size={22} stroke={2.2} /></span>
                      <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{p.text}</span>
                        {p.due && <span style={{ fontSize: 14, fontWeight: 600, color: "var(--amber-ink)" }}>Due {p.due}</span>}
                      </span>
                      <button className="btn btn-pill btn-amber" onClick={() => togglePromise(p.id)} style={{ padding: "0 14px" }}>Mark done</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="mobile-only">{sessions}</div>
        </div>

        {/* Desktop: the selected reply stays open on the right. */}
        <div className="today-right desk-only">
          {card(false)}
          {sessions}
        </div>
      </div>

      <TabBar />
    </main>
  );
}
