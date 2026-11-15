import { readDB } from "@/lib/store";
import VoiceClient from "./VoiceClient";

export const dynamic = "force-dynamic";

export default async function VoicePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const db = readDB();
  const sent = db.messages.filter((m) => m.direction === "out").map((m) => m.text);
  return <VoiceClient style={db.settings.style} sentCount={sent.length} settingsMode={Boolean(from)} />;
}
