import { readDB } from "@/lib/store";
import { aiEnabled } from "@/lib/ai";
import AddClient from "./AddClient";

export const dynamic = "force-dynamic";

export default async function AddPage() {
  const db = await readDB();
  const clients = db.contacts.filter((c) => c.isClient).map((c) => ({ id: c.id, name: c.name, channel: c.handles[0]?.channel ?? "texts" }));
  return <AddClient clients={clients} ai={aiEnabled()} />;
}
