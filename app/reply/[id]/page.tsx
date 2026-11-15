import { notFound } from "next/navigation";
import { readDB } from "@/lib/store";
import { timeLabel } from "@/lib/util";
import ReplyClient from "./ReplyClient";

export const dynamic = "force-dynamic";

export default async function ReplyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string }> }) {
  const { id } = await params;
  const { mode } = await searchParams;
  const db = await readDB();
  const msg = db.messages.find((m) => m.id === id);
  const contact = msg && db.contacts.find((c) => c.id === msg.clientId);
  if (!msg || !contact) notFound();

  const thread = db.messages
    .filter((m) => m.clientId === contact.id)
    .sort((a, b) => a.at.localeCompare(b.at))
    .filter((m) => m.at <= msg.at || m.direction === "out")
    .slice(-6)
    .map((m) => ({ id: m.id, direction: m.direction, text: m.text, time: timeLabel(m.at), audioUrl: m.audioUrl ?? null }));

  const facts: { label: string; value: string; tint: string; ink: string }[] = [];
  const goal = contact.goals[0];
  if (goal) facts.push({ label: "Goal", value: `${goal.title}${goal.target ? `, ${goal.target}` : ""}`, tint: "var(--mint-tint)", ink: "var(--mint-ink)" });
  if (goal?.progressLabel) facts.push({ label: "Progress", value: goal.progressLabel, tint: "var(--amber-tint)", ink: "var(--amber-ink)" });
  if (contact.nextSession) facts.push({ label: "Next session", value: contact.nextSession.when, tint: "var(--peri-tint)", ink: "var(--peri-ink)" });

  return (
    <ReplyClient
      messageId={msg.id}
      mode={mode === "nudge" ? "nudge" : "reply"}
      channel={msg.channel}
      client={{ id: contact.id, name: contact.name, initials: contact.initials, avatar: contact.avatar }}
      thread={thread}
      facts={facts.slice(0, 3)}
      defaultAngle={db.settings.style.defaultAngle}
    />
  );
}
