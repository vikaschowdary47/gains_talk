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
  /** Numbers the client reported in their messages (weight, steps, lifts...), oldest first. */
  stats?: Stat[];
  /** What GainsTalk learned from their messages, in plain English. */
  about?: { summary: string; facts: string[]; updatedAt: string };
  /** The coach brief: computed signals plus short wording, saved until the data changes. */
  brief?: Brief;
}

export interface Signal {
  key: string;
  level: "warn" | "good" | "info";
  label: string;
  value: string;
  detail: string;
}

export interface Brief {
  status: "check-in" | "on-track" | "steady" | "new";
  text: string;
  signals: Signal[];
  quotes: { text: string; at: string }[];
  basis: { messages: number; numbers: number };
  fingerprint: string;
  updatedAt: string;
  /** "ai" when Claude wrote the sentences, "rules" for the free template. */
  by: "ai" | "rules";
}


export interface Stat {
  id: string;
  /** Stable key for grouping, e.g. "weight", "body_fat", "steps", "squat". */
  kind: string;
  label: string;
  value: number;
  unit: string;
  at: string;
  sourceMessageId: string;
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
  /** The platform's own id for this message (webhook retries are ignored). */
  externalId?: string;
  imageUrl?: string;
  audioUrl?: string;
  drafts?: Drafts;
  /** Check-in drafts for clients who went quiet. */
  nudgeDrafts?: Drafts;
  repliedWith?: string;
  /** Came from a Channels test button. Replies to it are never really sent. */
  demo?: boolean;
  /** Outgoing only: how the reply left GainsTalk, and why the app couldn't send it. */
  sentVia?: "api" | "manual" | "demo";
  sendError?: string;
  /** Incoming only: already scanned for stats like weight. */
  statsChecked?: boolean;
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
  /** IANA zone from the coach's browser, e.g. America/Chicago. */
  timeZone?: string;
  /** The demo clients and messages old databases started with have been removed. */
  samplesCleared?: boolean;
  /** Whether the last Claude call worked, in plain English. */
  aiStatus?: { ok: boolean; at: string; detail: string };
  /** Which Meta server and account id answered for the pasted Instagram token (found by Check connection). */
  igRoute?: { base: string; account: string };
  /** The coach's connected Instagram professional account (Instagram Login). */
  instagram?: { userId: string; username?: string; token: string; expiresAt: string; connectedAt: string };
}

export interface DB {
  version: number;
  settings: Settings;
  contacts: Contact[];
  messages: Message[];
  promises: CoachPromise[];
  wins: Win[];
  pending: PendingContact[];
  /** Latest webhook calls from Meta, newest first. No message text. */
  webhookLog?: HookEvent[];
}

export interface HookEvent {
  at: string;
  channel: Channel;
  ok: boolean;
  result: string;
}
