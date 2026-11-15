# GainsTalk: the coach's inbox (MVP)

Every client message from every app in one place, sorted by who needs you.
Organizing runs on autopilot. Replies stay human.

Built from feedback from Daniel (coach, Trainerize user):

| Daniel said | What the MVP does |
| --- | --- |
| "Taking the seven inboxes into one" | One Today queue and one timeline per client across WhatsApp, Instagram, Messenger, TikTok, Trainerize, email and texts |
| Organizing should be autopilot, replying should be human | AI writes drafts, the coach picks, edits and sends. Nothing goes out without a tap |
| "Give it three options. Soft, mid, hard" | Every reply has Soft, Mid and Firm angles |
| No em dashes, natural not articulate | Style rules + a final clean-up pass strip em dashes and keep texts short and casual. Coaches can paste their own texts so drafts match their voice |
| Record a voice note while looking at the reply | Voice note screen shows talking points from the draft while you record, then opens the share sheet to send it in the client's app |
| "Is it going to read ALL of my messages?" | Coach picks clients during onboarding. Everyone else is dropped the moment a message arrives and never stored (see `lib/privacy.ts`) |
| Gather quotable lines and screenshots for content | Wins tab: client wins, screenshots and repeated questions, with ask-permission before posting |

## Run it

```bash
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY for real AI drafts
npm run dev
```

Open http://localhost:3000. You start at onboarding with demo clients.

**Works on any screen.** Phones get the one-card-at-a-time flow and a bottom tab bar.
Tablets use the full width with two-column lists. On laptops and desktops (1024px and up)
there's a sidebar, Today becomes a two-pane inbox (pick any message on the left, reply on
the right), and Reply and client profiles split into two columns.

**Try it on your phone:** run `npm run dev -- -H 0.0.0.0`, find your Mac's IP
(System Settings > Wi-Fi > Details) and open `http://<that-ip>:3000` on the phone
(same Wi-Fi). Add to Home Screen for the app feel. Voice recording on iPhone
needs HTTPS, so test voice notes on localhost or after deploying.

Reset everything: tap **Start over with demo data** on the Channels tab, or
`npm run reset-demo`.

## The flow

1. **Welcome**: pick the apps clients message you on
2. **Choose your clients**: the privacy gate. Only these chats are ever read
3. **Your texting style**: no em dashes, casual, default angle, sample texts
4. **Today**: tiles for replies ready, clients gone quiet, promises due. Swipe through reply cards: pick Soft/Mid/Firm, Send, Skip, edit or record a voice note
5. **Reply**: thread, what the drafts know, three angles, add your own touch
6. **Voice note**: talking points + recorder + share sheet
7. **Clients / client profile**: status per client, prep brief before sessions, promises, one timeline across channels
8. **Wins**: content ideas from chats with permission tracking
9. **Channels**: connection status, forwarding address, privacy summary
10. **Add a message**: paste text or a screenshot (AI reads it) for apps with no API

Promises are caught automatically from your replies ("i'll send your plan by
friday" becomes "Send Maya's plan, due Friday").

## What's real vs demo

- **Real now:** AI drafts in 3 angles (with `ANTHROPIC_API_KEY`), privacy gate,
  sending (WhatsApp Cloud API when configured; otherwise the reply is copied and
  the client's chat opens ready to paste), screenshot reading, voice notes,
  promise detection, wins scan, email intake, WhatsApp and Instagram webhooks.
- **Demo:** the sample clients and messages. Without an API key, drafts come from
  built-in examples.

## Connecting channels

### Email (works today)
1. Set `INBOUND_EMAIL_TOKEN` in `.env.local`.
2. Use any inbound email service (Postmark Inbound, SendGrid Inbound Parse,
   Cloudflare Email Routing + Worker) and point it at
   `https://YOUR-APP/api/intake/email?token=YOUR_TOKEN`.
3. In Gmail, add a filter that forwards client emails to that address. Forwarded
   emails are unwrapped to find the real sender. Non-clients are dropped.

### WhatsApp Business (Coexistence)
The coach keeps using the WhatsApp Business app on their phone. Messages flow
to GainsTalk through Meta's Cloud API, including messages the coach sends from the app.
1. Create a Meta app and become a Tech Provider, or go through a provider such as 360dialog.
2. Onboard the coach's number with Embedded Signup (Coexistence option).
3. Webhook URL: `https://YOUR-APP/api/webhooks/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`.
   Subscribe to `messages` and `smb_message_echoes`.
4. Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `META_APP_SECRET`.
   Check `META_GRAPH_VERSION` against Meta's current API version.

Note: since October 2026, Meta bills replies sent through the API per message
(with a monthly free allowance). Replies sent from the phone app stay free.

### Instagram
Webhook: `https://YOUR-APP/api/webhooks/instagram` with `INSTAGRAM_VERIFY_TOKEN`.
Needs a professional account and Meta app review. Add the client's Instagram
username or user id as a handle so messages match.

### Messenger, TikTok, Trainerize, texts
Use **Add a message** (paste or screenshot) for now. Trainerize's API needs
their Studio plan; TikTok business messaging isn't available in every region.

## Code map

```
app/                 pages (App Router) and API routes
  api/drafts         3 reply angles (+ check-in drafts for quiet clients)
  api/messages/[id]  send or skip (the only way anything is sent)
  api/intake/*       email webhook, paste/screenshot intake
  api/webhooks/*     WhatsApp, Instagram
  api/voice-notes    saves recordings
lib/privacy.ts       the privacy gate every incoming message passes through
lib/ai.ts            Claude prompts: drafts, screenshot reading, wins
lib/style.ts         natural-voice rules and the em dash clean-up
lib/promises.ts      catches "I'll send..." in your replies
lib/store.ts         JSON file store (data/db.json)
```

## Before real users

- **Storage:** `lib/store.ts` is a JSON file. Fine locally or on one small server
  with a disk (Railway, Render, Fly). For Vercel or more users, swap it for
  Supabase/Postgres. The rest of the app only calls `readDB`, `writeDB`, `updateDB`.
- **Accounts:** there's no login yet. It's one coach per install.
- **Privacy:** add a data processing agreement, delete-my-data, and tell clients
  an assistant helps their coach. Keep health details out of anything posted.
