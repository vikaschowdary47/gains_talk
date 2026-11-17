import { firstName } from "@/lib/util";
import { readDB } from "@/lib/store";
import { aiEnabled } from "@/lib/ai";
import WinsClient from "./WinsClient";

export const dynamic = "force-dynamic";

export default async function WinsPage() {
  const db = await readDB();
  const byId = new Map(db.contacts.map((c) => [c.id, c]));
  const wins = db.wins.map((w) => {
    const c = w.clientId ? byId.get(w.clientId) : undefined;
    const src = w.sourceMessageId ? db.messages.find((m) => m.id === w.sourceMessageId) : undefined;
    return {
      id: w.id,
      type: w.type,
      text: w.text,
      note: w.note ?? null,
      count: w.count ?? null,
      permission: w.permission,
      clientFirst: c ? firstName(c.name) : null,
      shownName: c ? `${firstName(c.name)} ${c.name.split(" ").slice(-1)[0][0]}.` : null,
      hiddenName: c ? `Client${c.since ? `, since ${c.since}` : ""}` : null,
      channel: src?.channel ?? null,
    };
  });
  return <WinsClient wins={wins} ai={aiEnabled()} />;
}
