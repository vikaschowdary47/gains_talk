"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ALL_CHANNELS, CHANNELS } from "@/lib/channels";
import type { Channel } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Avatar, Switch, Toast, postJSON, useToast } from "@/components/ui";

interface Person { id: string; name: string; initials: string; avatar: string; isClient: boolean; hint: string }
interface Pending { id: string; name: string; channel: Channel }

export default function ChooseClientsClient({ people, pending, from }: { people: Person[]; pending: Pending[]; from: string | null }) {
  const router = useRouter();
  const settingsMode = Boolean(from);
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(people.map((p) => [p.id, p.isClient])));
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "whatsapp" as Channel, handle: "" });
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();

  const visible = useMemo(() => people.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())), [people, q]);
  const likely = visible.filter((p) => p.isClient);
  const others = visible.filter((p) => !p.isClient);
  const count = Object.values(on).filter(Boolean).length;

  const save = async () => {
    setBusy(true);
    const res = await postJSON("/api/settings", { clients: on });
    setBusy(false);
    if (res.error) return showToast(res.error);
    if (settingsMode) {
      showToast("Client list saved");
      router.push(from === "clients" ? "/clients" : "/channels");
    } else router.push("/onboarding/voice");
  };

  const addPending = async (id: string) => {
    await postJSON("/api/settings", { addPending: id });
    router.refresh();
  };

  const addNew = async () => {
    if (!form.name.trim()) return showToast("Add a name");
    await postJSON("/api/settings", { newClient: form });
    setAdding(false);
    setForm({ name: "", channel: "whatsapp", handle: "" });
    showToast(`${form.name.trim()} added as a client`);
    router.refresh();
  };

  const Row = ({ p }: { p: Person }) => (
    <li>
      <Avatar initials={p.initials} color={p.isClient ? p.avatar : "#E7E8EE"} size={40} />
      <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</span>
        <span className="small muted">{p.hint}</span>
      </span>
      <Switch checked={!!on[p.id]} onChange={(v) => setOn({ ...on, [p.id]: v })} label={`Read chats with ${p.name}`} />
    </li>
  );

  return (
    <main className="app plain with-footer">
      <Toast msg={toast} />
      <div className="pad stack">
        <Link href={settingsMode ? (from === "clients" ? "/clients" : "/channels") : "/welcome"} className="back">
          <Icon name="chevron-left" size={24} stroke={2.2} /> Back
        </Link>
        <div className="stack-sm" style={{ padding: "0 4px" }}>
          {!settingsMode && (
            <div className="steps" role="img" aria-label="Step 2 of 3">
              <span className="on" /><span className="on" /><span />
            </div>
          )}
          <h1 className="display" style={{ fontSize: 30, lineHeight: "34px", fontWeight: 800, marginTop: 6 }}>Who are your clients?</h1>
          <p className="lead">GainsTalk only reads chats with people you pick here. Change it anytime.</p>
        </div>

        <div className="notice mint">
          <span className="ico" style={{ background: "var(--mint-ink)", color: "#fff" }}><Icon name="lock" /></span>
          <p style={{ margin: 0 }}>
            <strong>Friends and family stay private.</strong> Messages from anyone not on this list are dropped the moment they arrive and never saved.
          </p>
        </div>

        <label className="search">
          <Icon name="search" size={18} stroke={2.2} />
          <span className="sr-only">Search people</span>
          <input type="search" placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>

        {pending.length > 0 && (
          <section className="stack-sm" aria-labelledby="new-h">
            <h2 id="new-h" className="label">New people who messaged you</h2>
            <p className="small muted" style={{ margin: "0 4px" }}>We kept only their name. Add them if they're clients.</p>
            <ul className="group">
              {pending.map((p) => (
                <li key={p.id}>
                  <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</span>
                    <span className="small muted">{CHANNELS[p.channel].label}</span>
                  </span>
                  <button className="btn btn-pill btn-peri sm" onClick={() => addPending(p.id)}>Add as client</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="stack-sm" aria-labelledby="likely-h">
          <h2 id="likely-h" className="label">Looks like clients</h2>
          <ul className="group">{likely.map((p) => <Row key={p.id} p={p} />)}</ul>
        </section>

        {others.length > 0 && (
          <section className="stack-sm" aria-labelledby="others-h">
            <h2 id="others-h" className="label">Probably not clients</h2>
            <ul className="group">{others.map((p) => <Row key={p.id} p={p} />)}</ul>
          </section>
        )}

        {adding ? (
          <section className="card stack" aria-labelledby="add-h">
            <h2 id="add-h" className="label" style={{ margin: 0 }}>Add a client</h2>
            <div className="field">
              <label htmlFor="nc-name">Name</label>
              <input id="nc-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="nc-ch">Where do they message you?</label>
              <select id="nc-ch" className="select" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as Channel })}>
                {ALL_CHANNELS.map((c) => <option key={c} value={c}>{CHANNELS[c].label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="nc-h">Phone, email or username</label>
              <input id="nc-h" className="input" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} />
            </div>
            <div className="row">
              <button className="btn grow" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn btn-primary grow" onClick={addNew}>Add client</button>
            </div>
          </section>
        ) : (
          <button className="btn btn-white" onClick={() => setAdding(true)}>
            <Icon name="plus" /> Add someone who isn't listed
          </button>
        )}
      </div>

      <div className="footer-bar">
        <div>
          <button className="btn btn-primary btn-big" disabled={busy} onClick={save}>
            {settingsMode ? `Save ${count} ${count === 1 ? "client" : "clients"}` : `Continue with ${count} ${count === 1 ? "client" : "clients"}`}
          </button>
        </div>
      </div>
    </main>
  );
}
