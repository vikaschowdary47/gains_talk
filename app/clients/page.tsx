import { readDB } from "@/lib/store";
import { clientRows } from "@/lib/queries";
import ClientsClient from "./ClientsClient";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const db = await readDB();
  const hidden = db.contacts
    .filter((c) => !c.isClient)
    .map((c) => ({ id: c.id, name: c.name, initials: c.initials, avatar: c.avatar, channel: c.handles[0]?.channel ?? "texts" }));
  return <ClientsClient rows={clientRows(db)} hidden={hidden} />;
}
