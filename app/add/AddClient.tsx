"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ALL_CHANNELS, CHANNELS } from "@/lib/channels";
import type { Channel } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Sidebar, Toast, postJSON, useToast } from "@/components/ui";

type Line = { from: "client" | "coach"; text: string };

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function AddClient({ clients, ai }: { clients: { id: string; name: string; channel: Channel }[]; ai: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"paste" | "shot">("paste");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [channel, setChannel] = useState<Channel>(clients[0]?.channel ?? "texts");
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ data: string; type: string; preview: string } | null>(null);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return showToast("That image is too big. Try a smaller screenshot.");
    const data = await toBase64(f);
    setImage({ data, type: f.type || "image/png", preview: data });
    setLines(null);
    setBusy(true);
    const res = await postJSON<{ lines: Line[]; suggestedClientId: string | null }>("/api/intake/paste", { imageBase64: data, mediaType: f.type, channel, preview: true });
    setBusy(false);
    if (res.error) return showToast(res.error);
    setLines(res.lines);
    if (res.suggestedClientId) setClientId(res.suggestedClientId);
  };

  const save = async () => {
    setBusy(true);
    const body = mode === "shot" && image ? { imageBase64: image.data, mediaType: image.type, clientId, channel } : { text, clientId, channel };
    const res = await postJSON<{ added: number; needsReply: boolean }>("/api/intake/paste", body);
    setBusy(false);
    if (res.error) return showToast(res.error);
    router.push("/today");
    router.refresh();
  };

  const canSave = clientId && (mode === "paste" ? text.trim().length > 0 : Boolean(lines?.length));

  return (
    <main className="app plain with-footer has-nav narrow">
      <Sidebar />
      <Toast msg={toast} />
      <div className="pad stack">
        <Link href="/today" className="back"><Icon name="chevron-left" size={24} stroke={2.2} /> Today</Link>
        <div className="stack-sm" style={{ padding: "0 4px" }}>
          <h1 className="display" style={{ fontSize: 30, lineHeight: "34px", fontWeight: 800 }}>Add a message</h1>
          <p className="lead">For apps GainsTalk can&apos;t read yet, like texts, iMessage, TikTok or Trainerize. Paste it or drop in a screenshot.</p>
        </div>

        <div className="seg grey" role="group" aria-label="How to add" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <button type="button" aria-pressed={mode === "paste"} onClick={() => setMode("paste")}>Paste text</button>
          <button type="button" aria-pressed={mode === "shot"} onClick={() => setMode("shot")}>Screenshot</button>
        </div>

        <div className="field">
          <label htmlFor="client">Which client?</label>
          <select id="client" className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span className="small muted">Only clients are listed. Add new ones in Clients.</span>
        </div>

        <div className="field">
          <label htmlFor="channel">Where did it come from?</label>
          <select id="channel" className="select" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
            {ALL_CHANNELS.map((c) => <option key={c} value={c}>{CHANNELS[c].label}</option>)}
          </select>
        </div>

        {mode === "paste" ? (
          <div className="field">
            <label htmlFor="msg">Their message</label>
            <textarea id="msg" className="textarea" placeholder="Paste what they sent you" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
        ) : (
          <div className="stack-sm">
            {!ai && <div className="notice amber"><p style={{ margin: 0 }}>Reading screenshots needs an Anthropic API key in <code>.env.local</code>. Paste text works without one.</p></div>}
            <label className="btn btn-white" style={{ height: 120, flexDirection: "column", borderRadius: 20, border: "2px dashed var(--line)", boxShadow: "none" }}>
              <Icon name="image" size={28} />
              {image ? "Choose a different screenshot" : "Choose a screenshot"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
            {busy && !lines && <p className="lead center">Reading the screenshot...</p>}
            {lines && (
              <div className="card" style={{ gap: 8 }}>
                <span className="small muted" style={{ fontWeight: 700 }}>We read {lines.length} messages. Check them before saving.</span>
                {lines.map((l, i) => <p key={i} className={`bubble ${l.from === "coach" ? "out" : "in grey"}`} style={{ maxWidth: "88%" }}>{l.text}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="footer-bar">
        <div>
          <button className="btn btn-primary btn-big" disabled={!canSave || busy} onClick={save}>Save and draft a reply</button>
        </div>
      </div>
    </main>
  );
}
