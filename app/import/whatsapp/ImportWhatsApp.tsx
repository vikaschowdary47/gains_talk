"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Sidebar, Toast, postJSON, useToast } from "@/components/ui";

export default function ImportWhatsApp() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ added: number; updated: number; skipped: string[] } | null>(null);
  const [toast, showToast] = useToast();
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).length;

  const save = async () => {
    setBusy(true);
    const res = await postJSON<{ added: number; updated: number; skipped: string[] }>("/api/import/manual", { channel: "whatsapp", text });
    setBusy(false);
    if (res.error) return showToast(res.error);
    setDone(res);
    setText("");
    router.refresh();
  };

  return (
    <main className="app plain with-footer has-nav narrow">
      <Sidebar />
      <Toast msg={toast} />
      <div className="pad stack">
        <Link href="/clients" className="back"><Icon name="chevron-left" size={24} stroke={2.2} /> Clients</Link>
        <div className="stack-sm" style={{ padding: "0 4px" }}>
          <h1 className="display" style={{ fontSize: 30, lineHeight: "34px", fontWeight: 800 }}>Add clients from WhatsApp</h1>
          <p className="lead">WhatsApp doesn&apos;t let apps see your chat list or old messages, so paste your clients&apos; names and numbers here. Their new messages will show up from now on.</p>
        </div>

        {done && (
          <div className="notice mint" role="status">
            <p style={{ margin: 0 }}>
              Added {done.added} {done.added === 1 ? "client" : "clients"}{done.updated ? `, ${done.updated} were already saved` : ""}.
              {done.skipped.length ? ` Skipped ${done.skipped.length} line${done.skipped.length === 1 ? "" : "s"} without a number.` : ""}
            </p>
          </div>
        )}

        <div className="field">
          <label htmlFor="list">One client per line: name, then phone number</label>
          <textarea id="list" className="textarea" style={{ minHeight: 200 }} placeholder={"Maya Johnson, +1 312 555 0142\nJordan Lee, +44 7700 900123"} value={text} onChange={(e) => setText(e.target.value)} />
          <span className="small muted">Include the country code. You can paste two columns copied from a spreadsheet or your coaching app&apos;s client export.</span>
        </div>

        <div className="notice peri">
          <p style={{ margin: 0 }}>Coming later: when GainsTalk connects to WhatsApp Business directly, it can bring in up to 6 months of past chats when you connect.</p>
        </div>
      </div>
      <div className="footer-bar">
        <div>
          <button className="btn btn-primary btn-big" disabled={!lines || busy} onClick={save}>{busy ? "Adding…" : lines ? `Add ${lines} ${lines === 1 ? "client" : "clients"}` : "Paste your clients"}</button>
        </div>
      </div>
    </main>
  );
}
