"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJSON } from "@/components/ui";
import { firstName } from "@/lib/util";

/** Remove a client and delete everything GainsTalk keeps about them. */
export default function RemoveClient({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const first = firstName(name);

  const remove = async () => {
    setBusy(true);
    const res = await postJSON("/api/settings", { deleteClient: id });
    setBusy(false);
    if (res.error) return;
    router.push("/clients");
    router.refresh();
  };

  if (!confirming) {
    return (
      <button type="button" className="btn btn-pill sm remove-client" onClick={() => setConfirming(true)}>
        Remove {first} and delete their messages
      </button>
    );
  }
  return (
    <div className="remove-confirm" role="group" aria-label={`Remove ${name}`}>
      <p className="small" style={{ margin: 0 }}>
        This deletes {first}&apos;s messages, drafts and promises from GainsTalk. Their chats in WhatsApp and other apps stay as they are. You can&apos;t undo this.
      </p>
      <span className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-pill sm" onClick={() => setConfirming(false)} disabled={busy}>Keep {first}</button>
        <button type="button" className="btn btn-pill sm btn-danger" onClick={remove} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button>
      </span>
    </div>
  );
}
