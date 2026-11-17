import Link from "next/link";
import { readDB } from "@/lib/store";
import { timeLabel } from "@/lib/util";
import { Icon } from "@/components/Icon";
import { Sidebar } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Coaches who signed up for early access on /coaches. */
export default async function LeadsPage() {
  const db = await readDB();
  const leads = db.leads ?? [];
  return (
    <main className="app plain has-nav narrow">
      <Sidebar />
      <div className="pad stack">
        <Link href="/clients" className="back"><Icon name="chevron-left" size={24} stroke={2.2} /> Clients</Link>
        <div className="stack-sm" style={{ padding: "0 4px" }}>
          <h1 className="display" style={{ fontSize: 30, lineHeight: "34px", fontWeight: 800 }}>Coach sign-ups</h1>
          <p className="lead">Coaches who asked for a free month at gainstalk.com/coaches. Message them on Instagram.</p>
        </div>
        {leads.length === 0 ? (
          <p className="lead center">No sign-ups yet. Share gainstalk.com/coaches in your DMs.</p>
        ) : (
          <ul className="list cards">
            {leads.map((l) => (
              <li key={l.id} className="list-item" style={{ alignItems: "flex-start" }}>
                <span className="grow" style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{l.name}</span>
                  <a href={`https://instagram.com/${encodeURIComponent(l.instagram)}`} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>@{l.instagram}</a>
                  <span className="small muted">{l.clients || "?"} clients, mostly on {l.channel || "?"}</span>
                </span>
                <span className="small muted">{timeLabel(l.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
