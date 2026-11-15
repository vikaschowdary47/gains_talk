"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CHANNELS } from "@/lib/channels";
import type { Channel, Permission, WinType } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { TabBar, Toast, postJSON, useToast } from "@/components/ui";

interface WinView {
  id: string;
  type: WinType;
  text: string;
  note: string | null;
  count: number | null;
  permission: Permission;
  clientFirst: string | null;
  shownName: string | null;
  hiddenName: string | null;
  channel: Channel | null;
}

type Filter = "all" | WinType;

export default function WinsClient({ wins, ai }: { wins: WinView[]; ai: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [scanning, setScanning] = useState(false);
  const [toast, showToast] = useToast();
  const shown = wins.filter((w) => filter === "all" || w.type === filter);

  const scan = async () => {
    setScanning(true);
    const res = await postJSON<{ added: number }>("/api/wins", { action: "scan" });
    setScanning(false);
    showToast(res.error ?? (res.added ? `Found ${res.added} new ${res.added === 1 ? "win" : "wins"}` : "Nothing new yet. Check back after more chats."));
    router.refresh();
  };

  const setPerm = async (id: string, value: Permission, first: string | null) => {
    await postJSON("/api/wins", { action: "permission", id, value });
    if (value === "asked" && first) {
      const ask = `hey ${first.toLowerCase()}, this made my day. mind if i share it (no name) to help other people starting out?`;
      try {
        await navigator.clipboard.writeText(ask);
        showToast("Ask copied. Send it to them, then mark it OK when they say yes.");
      } catch {
        showToast("Marked as asked.");
      }
    }
    router.refresh();
  };

  const copyPost = async (w: WinView) => {
    const post =
      w.type === "question"
        ? `"${w.text}"\n\nI get asked this every week. Here's my answer:\n\n[your answer]\n\nSave this for later.`
        : `"${w.text}"\n\n${w.shownName ?? "A client"}. This is what consistency looks like.\n\n[what made the difference]`;
    try {
      await navigator.clipboard.writeText(post);
      showToast("Post starter copied. Paste it into your caption.");
    } catch {
      showToast("Couldn't copy. Long-press to select the text instead.");
    }
  };

  const action = (w: WinView) => {
    if (w.type === "question" || w.permission === "yes")
      return <button className="btn btn-pill btn-peri" onClick={() => copyPost(w)}>Make a post</button>;
    if (w.permission === "asked")
      return <button className="btn btn-pill btn-white" onClick={() => setPerm(w.id, "yes", w.clientFirst)}>They said yes</button>;
    return <button className="btn btn-pill btn-white" onClick={() => setPerm(w.id, "asked", w.clientFirst)}>Ask to share</button>;
  };

  const status = (p: Permission) =>
    p === "yes" ? { label: "OK to post", bg: "var(--mint)" } : p === "asked" ? { label: "Asked, waiting", bg: "var(--amber)" } : { label: "Not asked yet", bg: "#FFC2AC" };

  return (
    <main className="app plain has-nav">
      <Toast msg={toast} />
      <div className="pad stack">
        <header className="stack-sm" style={{ padding: "0 4px" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h1 className="h1" style={{ fontSize: 36, lineHeight: "40px" }}>Wins</h1>
            <button className="btn btn-pill btn-dark" onClick={scan} disabled={scanning}>
              <Icon name="refresh" size={16} stroke={2.2} /> {scanning ? "Looking" : "Find new"}
            </button>
          </div>
          <p className="lead">
            Quotable moments and the questions clients keep asking, pulled from your chats for content. Names stay hidden until a client says yes.
            {!ai && " Add an API key for smarter picks."}
          </p>
        </header>

        <div className="filters" role="group" aria-label="Filter wins">
          {([["all", "All"], ["quote", "Quotes"], ["shot", "Screenshots"], ["question", "Questions"]] as [Filter, string][]).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} style={{ background: filter === k ? "var(--navy)" : "#fff", color: filter === k ? "#fff" : "var(--ink)" }}>
              {label}
            </button>
          ))}
        </div>

        {shown.length === 0 && <p className="lead center" style={{ marginTop: 20 }}>No wins here yet. Tap Find new after a few more chats.</p>}

        <ul className="list cards" style={{ gap: 12 }}>
          {shown.map((w) => {
            const st = status(w.permission);
            const who = w.permission === "yes" ? w.shownName : w.hiddenName;
            const via = w.channel ? ` on ${CHANNELS[w.channel].label}` : "";
            if (w.type === "question")
              return (
                <li key={w.id} className="question-card">
                  <span className="pill" style={{ alignSelf: "flex-start", gap: 6, fontWeight: 800, background: "var(--amber)" }}>
                    <Icon name="question" size={13} stroke={2.4} /> Asked {w.count ?? 2} times
                  </span>
                  <p className="display" style={{ fontSize: 21, lineHeight: "26px", fontWeight: 700 }}>{w.text}</p>
                  {w.note && <span style={{ fontSize: 14, lineHeight: "20px", color: "#5C4300" }}>{w.note}</span>}
                  <div>{action(w)}</div>
                </li>
              );
            if (w.type === "shot")
              return (
                <li key={w.id} className="card">
                  <div className="shot" role="img" aria-label="Chat screenshot with the client's name hidden">
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 14, background: "#C9CBD8" }} />
                      {w.permission === "yes" ? <span style={{ fontSize: 13, fontWeight: 700 }}>{w.shownName}</span> : <span style={{ width: 96, height: 12, borderRadius: 6, background: "#C9CBD8" }} />}
                    </div>
                    <span className="bubble in" style={{ fontSize: 14 }}>{w.text}</span>
                    {w.note && <span className="bubble out" style={{ fontSize: 14 }}>{w.note}</span>}
                  </div>
                  <span className="small muted">{who}{via}</span>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="pill" style={{ background: st.bg }}>{st.label}</span>
                    {action(w)}
                  </div>
                </li>
              );
            return (
              <li key={w.id} className="quote-card">
                <span style={{ color: "var(--peri)" }}><Icon name="quote" size={30} stroke={2.6} /></span>
                <p>{w.text}</p>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.74)" }}>{who}{via}</span>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="pill" style={{ background: st.bg, color: "var(--ink)" }}>{st.label}</span>
                  {action(w)}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <TabBar />
    </main>
  );
}
