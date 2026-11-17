import { firstName } from "@/lib/util";
import { notFound } from "next/navigation";
import { readDB } from "@/lib/store";
import VoiceNoteClient from "./VoiceNoteClient";

export const dynamic = "force-dynamic";

export default async function VoiceNotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string }> }) {
  const { id } = await params;
  const { mode } = await searchParams;
  const db = await readDB();
  const msg = db.messages.find((m) => m.id === id);
  const contact = msg && db.contacts.find((c) => c.id === msg.clientId);
  if (!msg || !contact) notFound();
  return <VoiceNoteClient messageId={msg.id} mode={mode === "nudge" ? "nudge" : "reply"} firstName={firstName(contact.name)} channel={msg.channel} />;
}
