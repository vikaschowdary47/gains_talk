import type { DB, Message } from "./types";
import { isoMinus } from "./util";

/** Demo data so the app is useful before any channel is connected. */
export function seedDB(): DB {
  const m = (
    id: string,
    clientId: string,
    channel: Message["channel"],
    direction: "in" | "out",
    text: string,
    at: string,
    status: Message["status"] = "info"
  ): Message => ({ id, clientId, channel, direction, text, at, status });

  return {
    version: 1,
    settings: {
      onboarded: false,
      coachName: process.env.COACH_NAME || "Alex",
      apps: ["whatsapp", "instagram", "texts", "trainerize"],
      style: {
        noEmDashes: true,
        casual: true,
        matchEmoji: true,
        signOff: false,
        defaultAngle: "mid",
        samples: [],
      },
      forwardingLocalPart: "alex",
      ignoredCount: 0,
    },
    contacts: [
      {
        id: "maya", name: "Maya Patel", initials: "MP", avatar: "#B9C6FF", isClient: true,
        hint: "WhatsApp, Email. Talks training plans", since: "June 2026",
        handles: [{ channel: "whatsapp", value: "13125550142" }, { channel: "email", value: "maya.patel@example.com" }],
        goals: [
          { id: "g1", title: "Run a half marathon", target: "March 8", progress: 6 / 16, progressLabel: "Week 6 of 16" },
          { id: "g2", title: "Sleep 7+ hours on weeknights", progressLabel: "3 of 5 nights" },
        ],
        nextSession: { when: "Tue 6:00 PM", topic: "Race plan check-in" },
      },
      {
        id: "jordan", name: "Jordan Lee", initials: "JL", avatar: "#FFC2AC", isClient: true,
        hint: "Email. Weekly sessions", since: "August 2026",
        handles: [{ channel: "email", value: "jordan.lee@example.com" }],
        goals: [{ id: "g3", title: "Move into product management", target: "Q1" }],
        nextSession: { when: "Mon 6:00 PM", topic: "Interview prep" },
      },
      {
        id: "priya", name: "Priya Raman", initials: "PR", avatar: "#A8EBCF", isClient: true,
        hint: "Instagram. Check-ins", since: "September 2026",
        handles: [{ channel: "instagram", value: "priya.moves" }],
        goals: [{ id: "g4", title: "Consistent mornings", progressLabel: "4 of 7 days" }],
      },
      {
        id: "owen", name: "Owen Price", initials: "OP", avatar: "#FFE08A", isClient: true,
        hint: "Messenger, Trainerize", since: "September 2026",
        handles: [{ channel: "messenger", value: "owen.price" }],
        goals: [{ id: "g5", title: "Train 4x a week", progressLabel: "10 in a row" }],
      },
      {
        id: "chris", name: "Chris Bell", initials: "CB", avatar: "#A8EBCF", isClient: true,
        hint: "WhatsApp. Paid in September", since: "September 2026",
        handles: [{ channel: "whatsapp", value: "13125550199" }],
        goals: [],
      },
      {
        id: "elena", name: "Elena Ruiz", initials: "ER", avatar: "#F9B8D3", isClient: true,
        hint: "Email, Texts", since: "July 2026",
        handles: [{ channel: "email", value: "elena.ruiz@example.com" }, { channel: "texts", value: "+13125550123" }],
        goals: [],
      },
      {
        id: "sofia", name: "Sofia Nguyen", initials: "SN", avatar: "#A9DCF7", isClient: true,
        hint: "TikTok, Trainerize", since: "June 2026",
        handles: [{ channel: "tiktok", value: "sofialifts" }],
        goals: [{ id: "g6", title: "First unassisted pull-up", progressLabel: "Done" }],
        nextSession: { when: "Wed 8:00 AM", topic: "Monthly review" },
      },
      {
        id: "mom", name: "Mom", initials: "M", avatar: "#E7E8EE", isClient: false,
        hint: "WhatsApp", handles: [{ channel: "whatsapp", value: "13125550100" }], goals: [],
      },
      {
        id: "sam", name: "Sam Rivera", initials: "SR", avatar: "#E7E8EE", isClient: false,
        hint: "Texts", handles: [{ channel: "texts", value: "+13125550111" }], goals: [],
      },
    ],
    messages: [
      m("m1", "maya", "whatsapp", "out", "long run sunday, 14k easy. take a gel halfway", isoMinus(2, 10)),
      m("m2", "maya", "email", "in", "Registered for the March 8 half. Confirmation attached.", isoMinus(3)),
      m("m3", "maya", "whatsapp", "in", "Missed my long run Sunday, legs felt heavy. Should I make it up this week?", isoMinus(0, 2), "needs_reply"),
      m("m4", "jordan", "email", "in", "Got the second-round interview at Northwind! Can we move Tuesday's session to Monday?", isoMinus(0, 3), "needs_reply"),
      m("m5", "priya", "instagram", "in", "Could you resend the morning routine template? I lost it.", isoMinus(1, 1), "needs_reply"),
      m("m6", "owen", "messenger", "in", "Hit 10 workouts in a row. Feeling strong.", isoMinus(1, 4), "needs_reply"),
      m("m7", "owen", "messenger", "in", "Should I make up a missed workout or just move on?", isoMinus(9)),
      m("m8", "chris", "whatsapp", "in", "Busy week, will log my meals tomorrow", isoMinus(9)),
      m("m9", "elena", "email", "in", "Quick one, should I make up the session I missed?", isoMinus(12)),
      m("m10", "sofia", "tiktok", "in", "First unassisted pull up today!! couldn't believe it", isoMinus(4)),
      m("m11", "sofia", "tiktok", "out", "LETS GO. told you the band work would pay off", isoMinus(4)),
      m("m12", "maya", "whatsapp", "out", "nice!! i'll send your march race plan by friday", isoMinus(3)),
    ],
    promises: [
      { id: "p1", clientId: "maya", text: "Send Maya her race plan", due: "Friday", done: false, createdAt: isoMinus(3), sourceMessageId: "m12" },
    ],
    wins: [
      { id: "w1", type: "quote", clientId: "owen", text: "Hit 10 workouts in a row. Feeling strong.", permission: "none", createdAt: isoMinus(1), sourceMessageId: "m6" },
      { id: "w2", type: "question", text: "Should I make up a missed workout?", note: "Owen, Elena and others asked this. Your answers already make a great post.", count: 3, permission: "yes", createdAt: isoMinus(1) },
      { id: "w3", type: "shot", clientId: "sofia", text: "First unassisted pull up today!! couldn't believe it", note: "LETS GO. told you the band work would pay off", permission: "yes", createdAt: isoMinus(4), sourceMessageId: "m10" },
    ],
    pending: [],
  };
}

/** The made-up clients that come with the app. Their numbers and usernames
 *  aren't real, so replies to them are marked as sent instead of sent. */
const SAMPLE_IDS = new Set(seedDB().contacts.map((c) => c.id));
export function isSampleContact(c: { id: string }): boolean {
  return SAMPLE_IDS.has(c.id);
}
