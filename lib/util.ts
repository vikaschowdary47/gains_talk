export function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATARS = ["#B9C6FF", "#FFC2AC", "#A8EBCF", "#FFE08A", "#F9B8D3", "#A9DCF7"];
export function avatarFor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
}

export function daysAgo(iso: string, now = Date.now()): number {
  return Math.floor((now - new Date(iso).getTime()) / 86_400_000);
}

/** The coach's time zone. The server runs in UTC, so times are shown in this zone. */
let ZONE: string | undefined;
export function setTimeZone(zone?: string) {
  ZONE = zone || process.env.COACH_TIMEZONE || undefined;
}
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: ZONE });

export function timeLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (dayKey(d) === dayKey(now)) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: ZONE });
  if (days < 2) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "short", timeZone: ZONE });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: ZONE });
}

/** "Sunday, November 15" in the coach's time zone. */
export function todayLabel(now = new Date()): string {
  return now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: ZONE });
}

export function isoMinus(days: number, hours = 0): string {
  return new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString();
}
