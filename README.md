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
  promise detection, wins scan, email intake, WhatsApp, Instagram and Messenger
  webhooks (receive and send), the intake link, new-people approvals.
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
1. In your Meta app, add the **Instagram** use case and open **API setup with Instagram login**.
2. Copy the **Instagram app ID** and **Instagram app secret** into `INSTAGRAM_APP_ID` and
   `INSTAGRAM_APP_SECRET`. Add `https://YOUR-APP/api/instagram/callback` as a redirect URL.
3. Webhooks: callback `https://YOUR-APP/api/webhooks/instagram`, verify token =
   `INSTAGRAM_VERIFY_TOKEN`, subscribe to `messages`.
4. Until the app has Instagram Advanced Access, only accounts added as **Instagram testers**
   (App roles) work. Add the coach's account, and the test client's account, and accept the
   invite in Instagram (Settings → Website permissions → Tester invites).
5. In the Instagram app: Settings → Messages → Connected tools → **Allow access to messages**.
6. On Channels, tap **Connect Instagram** and sign in with the coach's professional account.
   The token is stored and refreshed automatically.

### Facebook Messenger
1. Add the **Messenger** product to the same Meta app and connect the coach's Page.
2. Webhook: `https://YOUR-APP/api/webhooks/messenger`, verify token =
   `MESSENGER_VERIFY_TOKEN` (or `META_VERIFY_TOKEN`). Subscribe to `messages`.
3. Generate a Page access token and set `MESSENGER_PAGE_TOKEN` so replies send
   from GainsTalk.

While the Meta app is in development mode, only people with a role on the app
(admin, developer, tester) reach the webhooks. That's enough to test with your
own accounts. Real clients need Meta's app review.

### Trainerize and texts (intake link)
Set `INTAKE_TOKEN`, then anything that can send a web request can drop messages in:
`POST https://YOUR-APP/api/intake/webhook?token=INTAKE_TOKEN` with JSON
`{"channel":"trainerize","from":"maya@example.com","name":"Maya","text":"..."}`
(or an array of these). Channels: whatsapp, instagram, messenger, email, texts,
trainerize, tiktok.
- **Trainerize:** a Zapier or Make zap on "new message" posts to the link.
- **Texts (iPhone):** a Shortcuts automation on "When I get a message from..." with
  "Get contents of URL" (POST, JSON body).

### TikTok
No messaging API for coaches yet. Use **Add a message** (paste or screenshot).

### Demo without any accounts
On **Channels**, every channel has **Send a test message**: a sample message from
one of your clients lands on Today. **Test the privacy check** sends one from a
stranger, which shows up under "New people messaged you" instead of the inbox.

## Code map

```
app/                 pages (App Router) and API routes
  api/drafts         3 reply angles (+ check-in drafts for quiet clients)
  api/messages/[id]  send or skip (the only way anything is sent)
  api/intake/*       email webhook, paste/screenshot intake
  api/webhooks/*     WhatsApp, Instagram, Messenger
  api/intake/webhook intake link for Zapier, Make, iPhone Shortcuts
  api/demo/simulate  test messages for the Channels screen
  api/voice-notes    saves recordings
lib/privacy.ts       the privacy gate every incoming message passes through
lib/ai.ts            Claude prompts: drafts, screenshot reading, wins
lib/style.ts         natural-voice rules and the em dash clean-up
lib/promises.ts      catches "I'll send..." in your replies
lib/store.ts         data store: Redis on Vercel, JSON file locally
```

## Deploy to Vercel

Vercel's servers can't keep files, so the app stores its data in Redis there.

1. Import the GitHub repo in Vercel and deploy.
2. In the Vercel project: **Storage → Create Database → Upstash for Redis** (free
   tier) and connect it to the project. That adds `KV_REST_API_URL` and
   `KV_REST_API_TOKEN` automatically.
3. Add your other settings under **Settings → Environment Variables** (the same
   names as `.env.local`: `ANTHROPIC_API_KEY`, `WHATSAPP_TOKEN`,
   `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET`,
   `INTAKE_TOKEN`, ...).
4. Redeploy. The WhatsApp webhook URL is then
   `https://YOUR-APP.vercel.app/api/webhooks/whatsapp`.

Without Redis the app still loads on Vercel, but data is temporary and the
Channels screen says so.

## Before real users

- **Storage:** `lib/store.ts` keeps everything in one JSON document. Locally it's
  `data/db.json`; on Vercel it uses Redis (below). For many coaches, move to
  Postgres. The rest of the app only calls `readDB`, `writeDB`, `updateDB`.
- **Accounts:** there's no login yet. It's one coach per install.
- **Privacy:** add a data processing agreement, delete-my-data, and tell clients
  an assistant helps their coach. Keep health details out of anything posted.
