export type Channel =
  | "whatsapp"
  | "instagram"
  | "messenger"
  | "tiktok"
  | "trainerize"
  | "email"
  | "texts";

export type Angle = "soft" | "mid" | "firm";

export interface Handle {
  channel: Channel;
  /** Phone number (digits), email address, or platform user id / username. */
  value: string;
}

export interface Goal {
  id: string;
  title: string;
  target?: string;
  /** 0..1 */
  progress?: number;
  progressLabel?: string;
}

export interface Contact {
  id: string;
  name: string;
  initials: string;
  avatar: string;
  handles: Handle[];
  /** Only contacts marked as clients are ever read. */
  isClient: boolean;
  /** Why we think this is (or isn't) a client. Shown during onboarding. */
  hint?: string;
  since?: string;
  goals: Goal[];
  nextSession?: { when: string; topic: string };
}

export type MessageStatus = "needs_reply" | "replied" | "skipped" | "info";

export interface Drafts {
  soft: string;
  mid: string;
  firm: string;
  talkingPoints: string[];
  basedOn: string[];
  source: "ai" | "demo";
}

export interface Message {
  id: string;
  clientId: string;
  channel: Channel;
  direction: "in" | "out";
  text: string;
  at: string;
  status: MessageStatus;
  imageUrl?: string;
  audioUrl?: string;
  drafts?: Drafts;
  /** Check-in drafts for clients who went quiet. */
  nudgeDrafts?: Drafts;
  repliedWith?: string;
}

export interface CoachPromise {
  id: string;
  clientId: string;
  text: string;
  due?: string;
  done: boolean;
  createdAt: string;
  sourceMessageId?: string;
}

export type WinType = "quote" | "shot" | "question";
export type Permission = "none" | "asked" | "yes";

export interface Win {
  id: string;
  type: WinType;
  clientId?: string;
  text: string;
  /** For screenshots: the coach's reply. For questions: a note. */
  note?: string;
  count?: number;
  permission: Permission;
  createdAt: string;
  sourceMessageId?: string;
}

export interface StyleSettings {
  noEmDashes: boolean;
  casual: boolean;
  matchEmoji: boolean;
  signOff: boolean;
  defaultAngle: Angle;
  /** Texts the coach pasted so drafts learn their voice. */
  samples: string[];
}

/** People who messaged a connected channel but are not on the client list.
 *  Only name + handle are kept. Message content is never stored. */
export interface PendingContact {
  id: string;
  name: string;
  handle: Handle;
  firstSeen: string;
}

export interface Settings {
  onboarded: boolean;
  coachName: string;
  apps: Channel[];
  style: StyleSettings;
  forwardingLocalPart: string;
  ignoredCount: number;
}

export interface DB {
  version: number;
  settings: Settings;
  contacts: Contact[];
  messages: Message[];
  promises: CoachPromise[];
  wins: Win[];
  pending: PendingContact[];
}
