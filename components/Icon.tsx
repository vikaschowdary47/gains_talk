import type { ReactNode } from "react";

type Name =
  | "send" | "pencil" | "mic" | "chevron-left" | "chevron-right" | "check" | "clock" | "chat" | "mail"
  | "photo" | "note" | "app" | "text" | "sun" | "people" | "star" | "link" | "plus" | "search" | "lock"
  | "share" | "copy" | "quote" | "question" | "play" | "refresh" | "sliders" | "image";

const PATHS: Record<Name, ReactNode> = {
  send: (<><path d="M21 3L10 14" /><path d="M21 3l-7 18-4-7-7-4z" /></>),
  pencil: (<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0" /><path d="M12 17.5V21" /></>),
  "chevron-left": <path d="M15 5l-7 7 7 7" />,
  "chevron-right": <path d="M9 5l7 7-7 7" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>),
  photo: (<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7l2-3h4l2 3" /><circle cx="12" cy="13.5" r="3.5" /></>),
  note: (<><path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 4c.6 2.4 2.4 4 5 4" /></>),
  app: <path d="M6.5 8v8M17.5 8v8M3.5 10v4M20.5 10v4M6.5 12h11" />,
  text: (<><path d="M4 6h16v10H8l-4 3z" /><path d="M8 10h8M8 13h5" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>),
  people: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" /><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8" /></>),
  star: <path d="M12 3.5l2.6 5.4 5.9.7-4.4 4 1.2 5.9-5.3-3-5.3 3 1.2-5.9-4.4-4 5.9-.7z" />,
  link: (<><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>),
  lock: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  share: (<><path d="M12 3v12" /><path d="M7.5 7.5L12 3l4.5 4.5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></>),
  copy: (<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>),
  quote: <path d="M5 18v-5c0-4 2-7 6-8M14 18v-5c0-4 2-7 6-8" />,
  question: (<><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.3M12 16.6v.4" /></>),
  play: <path d="M7 4.5v15l12-7.5z" />,
  refresh: (<><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16" /><path d="M20 20v-4h-4" /></>),
  sliders: (<><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>),
  image: (<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>),
};

export function Icon({ name, size = 20, stroke = 2, label }: { name: Name; size?: number; stroke?: number; label?: string }) {
  const filled = name === "play";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ flex: "none" }}
    >
      {PATHS[name]}
    </svg>
  );
}

export function Rings({ color = "#8FA6FF", className = "rings" }: { color?: string; className?: string }) {
  return (
    <svg className={className} width="300" height="300" viewBox="0 0 300 300" fill="none" aria-hidden="true">
      <circle cx="150" cy="150" r="70" stroke={color} strokeOpacity="0.16" strokeWidth="2" />
      <circle cx="150" cy="150" r="100" stroke={color} strokeOpacity="0.12" strokeWidth="2" />
      <circle cx="150" cy="150" r="130" stroke={color} strokeOpacity="0.08" strokeWidth="2" />
    </svg>
  );
}
