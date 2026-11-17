"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJSON } from "@/components/ui";

/** Bring in recent Instagram messages and refresh notes and stats for one client. */
export default function CatchUp({ id, hasInstagram, label }: { id: string; hasInstagram: boolean; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async () => {
    setBusy(true);
    setNote(null);
    const res = await postJSON<{ imported: number; stats: number; learned: boolean; problem?: string }>(`/api/clients/${id}/catchup`, {});
    setBusy(false);
    if (res.error) return setNote({ ok: false, text: res.error });
    const parts = [
      hasInstagram ? `${res.imported} new ${res.imported === 1 ? "message" : "messages"} from Instagram` : null,
      res.stats ? `${res.stats} new ${res.stats === 1 ? "stat" : "stats"} logged` : null,
      res.learned ? "notes updated" : null,
    ].filter(Boolean);
    setNote({ ok: !res.problem, text: [parts.length ? `Done: ${parts.join(", ")}.` : "Nothing new found.", res.problem].filter(Boolean).join(" ") });
    router.refresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
      <button type="button" className="btn btn-pill sm btn-white" onClick={run} disabled={busy}>
        {busy ? "Catching up…" : label ?? (hasInstagram ? "Catch up from Instagram" : "Update notes from messages")}
      </button>
      {note && <span role="status" className={`send-note${note.ok ? "" : " bad"}`}>{note.text}</span>}
    </div>
  );
}
