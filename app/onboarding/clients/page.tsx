import { readDB } from "@/lib/store";
import ChooseClientsClient from "./ChooseClientsClient";

export const dynamic = "force-dynamic";

export default async function ChooseClientsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const db = readDB();
  const people = db.contacts.map((c) => ({
    id: c.id,
    name: c.name,
    initials: c.initials,
    avatar: c.avatar,
    isClient: c.isClient,
    hint: c.hint ?? c.handles.map((h) => h.channel).join(", "),
  }));
  const pending = db.pending.map((p) => ({ id: p.id, name: p.name, channel: p.handle.channel }));
  return <ChooseClientsClient people={people} pending={pending} from={from ?? null} />;
}
