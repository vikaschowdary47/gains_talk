"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientRow, ClientStatus } from "@/lib/queries";
import { Icon } from "@/components/Icon";
import { Avatar, ChannelChip, TabBar, postJSON } from "@/components/ui";
import type { Channel } from "@/lib/types";

interface Hidden { id: string; name: string; initials: string; avatar: string; channel: Channel }

const STATUS: Record<ClientStatus, { bg: string; ink: string }> = {
  replies: { bg: "var(--peri)", ink: "var(--ink)" },
  quiet: { bg: "var(--coral)", ink: "var(--ink)" },
  track: { bg: "var(--mint-tint)", ink: "var(--mint-ink)" },
};

type Filter = "all" | ClientStatus;

export default function ClientsClient({ rows, hidden }: { rows: ClientRow[]; hidden: Hidden[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const makeClient = async (id: string) => {
    setBusy(id);
    await postJSON("/api/settings", { clients: { [id]: true } });
    setBusy(null);
    router.refresh();
  };
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const count = (s: ClientStatus) => rows.filter((r) => r.status === s).length;
  const filters: { key: Filter; label: string; fill: string; ink: string; dot: string }[] = [
    { key: "all", label: `All ${rows.length}`, fill: "var(--navy)", ink: "#fff", dot: "var(--peri)" },
    { key: "replies", label: `Replies ${count("replies")}`, fill: "var(--peri)", ink: "var(--ink)", dot: "var(--primary)" },
    { key: "quiet", label: `Quiet ${count("quiet")}`, fill: "var(--coral)", ink: "var(--ink)", dot: "#D9481F" },
    { key: "track", label: `On track ${count("track")}`, fill: "var(--mint)", ink: "var(--ink)", dot: "var(--mint-ink)" },
  ];
  const shown = rows.filter((r) => (filter === "all" || r.status === filter) && r.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <main className="app plain has-nav">
      <div className="pad stack">
        <header className="row" style={{ justifyContent: "space-between", padding: "0 4px" }}>
          <h1 className="h1" style={{ fontSize: 36, lineHeight: "40px" }}>Clients</h1>
          <Link href="/onboarding/clients?from=clients" className="btn btn-primary btn-round" aria-label="Choose who counts as a client">
            <Icon name="plus" size={22} stroke={2.4} />
          </Link>
        </header>

        <label className="search">
          <Icon name="search" size={18} stroke={2.2} />
          <span className="sr-only">Search clients</span>
          <input type="search" placeholder="Search clients" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>

        <div className="filters" role="group" aria-label="Filter clients">
          {filters.map((f) => {
            const on = filter === f.key;
            return (
              <button key={f.key} type="button" aria-pressed={on} onClick={() => setFilter(f.key)} style={{ background: on ? f.fill : "#fff", color: on ? f.ink : "var(--ink)" }}>
                <span className="dot" style={{ background: on ? (f.key === "all" ? "var(--peri)" : "var(--ink)") : f.dot }} />
                {f.label}
              </button>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <p className="lead center" style={{ marginTop: 24 }}>No clients yet. When someone new messages you, they show up on Today so you can add them.</p>
        ) : shown.length === 0 ? (
          <p className="lead center" style={{ marginTop: 24 }}>No clients match that.</p>
        ) : (
          <ul className="list cards">
            {shown.map((r) => (
              <li key={r.id}>
                <Link href={`/clients/${r.id}`} className="list-item">
                  <Avatar initials={r.initials} color={r.avatar} size={46} />
                  <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                      <span className="small muted" style={{ flex: "none" }}>{r.when}</span>
                    </span>
                    <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                      <span className="pill" style={{ height: 24, background: STATUS[r.status].bg, color: STATUS[r.status].ink }}>{r.statusLabel}</span>
                      <ChannelChip channel={r.channelKey} />
                    </span>
                  </span>
                  <span style={{ color: "#9A9CB0" }}><Icon name="chevron-right" size={16} stroke={2.4} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {hidden.length > 0 && (
          <section className="stack" style={{ gap: 8, marginTop: 8 }} aria-labelledby="hidden-h">
            <button type="button" className="btn btn-pill sm" style={{ alignSelf: "flex-start" }} aria-expanded={showHidden} onClick={() => setShowHidden((v) => !v)}>
              <span id="hidden-h">{showHidden ? "Hide" : "Show"} people you marked not a client ({hidden.length})</span>
            </button>
            {showHidden && (
              <>
                <p className="small muted" style={{ margin: "0 4px" }}>Their messages are dropped without being read. Add one as a client to start reading and drafting replies.</p>
                <ul className="list cards">
                  {hidden.map((h) => (
                    <li key={h.id} className="list-item">
                      <Avatar initials={h.initials} color="#E7E8EE" size={40} />
                      <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                        <ChannelChip channel={h.channel} />
                      </span>
                      <button type="button" className="btn btn-pill sm btn-primary" disabled={busy === h.id} onClick={() => makeClient(h.id)}>
                        {busy === h.id ? "Adding…" : "Add as client"}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
      </div>
      <TabBar />
    </main>
  );
}
