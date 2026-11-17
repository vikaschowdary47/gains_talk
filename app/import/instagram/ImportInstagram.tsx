"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Sidebar, Toast, postJSON, useToast } from "@/components/ui";
import { timeLabel } from "@/lib/util";

interface Person { igsid: string; username?: string; name?: string; lastAt?: string; status: "client" | "hidden" | "new" }

const BATCH = 6;

export default function ImportInstagram({ connected, first }: { connected: boolean; first: boolean }) {
  const router = useRouter();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<"import" | "fresh">("import");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ added: number; imported: number; problem?: string } | null>(null);
  const [toast, showToast] = useToast();

  useEffect(() => {
    if (!connected) return;
    fetch("/api/import/list", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { people?: Person[]; error?: string }) => {
        setPeople(j.people ?? []);
        if (j.error) setError(j.error);
      })
      .catch(() => setError("Couldn't reach GainsTalk. Check your connection and try again."));
  }, [connected]);

  const available = useMemo(() => (people ?? []).filter((p) => p.status !== "client"), [people]);
  const already = (people ?? []).length - available.length;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    return q ? available.filter((p) => `${p.name ?? ""} ${p.username ?? ""}`.toLowerCase().includes(q)) : available;
  }, [available, query]);

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allShownPicked = shown.length > 0 && shown.every((p) => picked.has(p.igsid));
  const toggleAll = () =>
    setPicked((s) => {
      const n = new Set(s);
      for (const p of shown) {
        if (allShownPicked) n.delete(p.igsid);
        else n.add(p.igsid);
      }
      return n;
    });

  const add = async () => {
    const chosen = available.filter((p) => picked.has(p.igsid));
    if (!chosen.length) return;
    let added = 0;
    let imported = 0;
    let problem: string | undefined;
    setProgress({ done: 0, total: chosen.length });
    for (let i = 0; i < chosen.length; i += BATCH) {
      const slice = chosen.slice(i, i + BATCH).map(({ igsid, username, name }) => ({ igsid, username, name }));
      const res = await postJSON<{ added: number; imported: number; problem?: string }>("/api/import/instagram", { people: slice, history: history === "import" });
      if (res.error) {
        showToast(res.error);
        break;
      }
      added += res.added;
      imported += res.imported;
      problem ??= res.problem;
      setProgress({ done: Math.min(i + BATCH, chosen.length), total: chosen.length });
    }
    setProgress(null);
    setResult({ added, imported, problem });
    router.refresh();
  };

  const label = (p: Person) => p.name || (p.username ? `@${p.username}` : "Instagram user");

  return (
    <main className="app plain with-footer has-nav narrow">
      <Sidebar />
      <Toast msg={toast} />
      <div className="pad stack">
        <Link href="/clients" className="back"><Icon name="chevron-left" size={24} stroke={2.2} /> Clients</Link>
        <div className="stack-sm" style={{ padding: "0 4px" }}>
          <h1 className="display" style={{ fontSize: 30, lineHeight: "34px", fontWeight: 800 }}>{first ? "Who are your clients?" : "Add clients from Instagram"}</h1>
          <p className="lead">These are the people you&apos;ve chatted with on Instagram. Only names are shown. GainsTalk doesn&apos;t read anyone&apos;s messages until you pick them as a client.</p>
        </div>

        {!connected && (
          <div className="notice amber"><p style={{ margin: 0 }}>Instagram isn&apos;t connected yet. Connect it on <Link href="/channels">Channels</Link> first.</p></div>
        )}

        {result ? (
          <div className="card stack-sm" role="status">
            <h2 className="h2" style={{ fontSize: 22, margin: 0 }}>Added {result.added} {result.added === 1 ? "client" : "clients"}</h2>
            {history === "import" ? (
              <p style={{ margin: 0, fontSize: 16, lineHeight: "23px" }}>
                Brought in {result.imported} recent messages. GainsTalk is now reading them to fill in each client&apos;s goals, notes and stats. Give it a minute.
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 16, lineHeight: "23px" }}>Starting fresh: their profiles are empty for now. New messages will appear from here on, and you can add goals and notes on each client&apos;s page.</p>
            )}
            {result.problem && <p className="send-note bad" style={{ margin: 0 }}>{result.problem}</p>}
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <Link href="/clients" className="btn btn-primary btn-pill">See my clients</Link>
              <button type="button" className="btn btn-pill btn-white" onClick={() => { setResult(null); setPicked(new Set()); }}>Add more</button>
            </div>
          </div>
        ) : connected && people === null ? (
          <p className="lead center" role="status">Getting your Instagram chats…</p>
        ) : connected && (
          <>
            {error && <div className="notice amber"><p style={{ margin: 0 }}>{error}</p></div>}
            {people && people.length > 0 && (
              <>
                <div className="field">
                  <label htmlFor="find">Find someone</label>
                  <input id="find" className="input" type="search" placeholder="Name or @username" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <div className="row" style={{ justifyContent: "space-between", padding: "0 4px", gap: 8, flexWrap: "wrap" }}>
                  <span className="small muted">{available.length} people{already ? `, ${already} already clients` : ""}</span>
                  {shown.length > 0 && (
                    <button type="button" className="btn btn-pill sm btn-white" onClick={toggleAll}>{allShownPicked ? "Unselect all" : `Select all ${shown.length}`}</button>
                  )}
                </div>
                <ul className="list cards" aria-label="People you chat with on Instagram">
                  {shown.map((p) => (
                    <li key={p.igsid} className="list-item" style={{ padding: 0 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", width: "100%", cursor: "pointer", minHeight: 44 }}>
                        <input type="checkbox" checked={picked.has(p.igsid)} onChange={() => toggle(p.igsid)} style={{ width: 22, height: 22, flex: "none", accentColor: "var(--primary)" }} />
                        <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label(p)}</span>
                          <span className="small muted">
                            {p.name && p.username ? `@${p.username}, ` : ""}
                            {p.lastAt ? `Last chatted ${timeLabel(p.lastAt).toLowerCase()}` : ""}
                            {p.status === "hidden" ? ", marked not a client" : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                {shown.length === 0 && <p className="lead center">No one matches that.</p>}

                <fieldset className="card stack-sm" style={{ border: 0, margin: 0 }}>
                  <legend className="h2" style={{ fontSize: 19, padding: 0, marginBottom: 8 }}>Their past messages</legend>
                  <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", minHeight: 44 }}>
                    <input type="radio" name="history" checked={history === "import"} onChange={() => setHistory("import")} style={{ width: 20, height: 20, marginTop: 2, flex: "none" }} />
                    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 700 }}>Bring in recent messages (recommended)</span>
                      <span className="small muted">Instagram shares the last 20 messages of each chat. GainsTalk reads them once to fill in goals, notes and stats for you.</span>
                    </span>
                  </label>
                  <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", minHeight: 44 }}>
                    <input type="radio" name="history" checked={history === "fresh"} onChange={() => setHistory("fresh")} style={{ width: 20, height: 20, marginTop: 2, flex: "none" }} />
                    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 700 }}>Start fresh</span>
                      <span className="small muted">Only new messages from now on. You&apos;ll add each client&apos;s goals and details by hand.</span>
                    </span>
                  </label>
                </fieldset>
              </>
            )}
            {people && people.length === 0 && !error && (
              <p className="lead center">No Instagram chats found yet. When someone messages you, they&apos;ll show up on Today.</p>
            )}
          </>
        )}
      </div>

      {!result && connected && (people?.length ?? 0) > 0 && (
        <div className="footer-bar">
          <div>
            <button className="btn btn-primary btn-big" disabled={picked.size === 0 || Boolean(progress)} onClick={add}>
              {progress ? `Adding ${progress.done} of ${progress.total}…` : picked.size ? `Add ${picked.size} as ${picked.size === 1 ? "client" : "clients"}` : "Pick your clients"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
