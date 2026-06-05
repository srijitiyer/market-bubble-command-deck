# Market Bubble — Command Deck

One real-time feed for **Twitch + Kick + X**. Watch every stream and merge every
chat into a single, source-labeled command deck. Built for the Market Bubble
$10,000 Vibe Code Challenge.

## What it does

- **Unified live feed** — Twitch, Kick and X chat merged into one real-time,
  virtualized stream. Each message carries a colored **source label** (icon +
  platform accent rail) so you always know where it came from.
- **Native multistream watch** — embed and watch the active stream right in the
  deck while you read the merged chat.
- **Live audience map** — every active chatter as a platform-ringed dot. **Hover
  any viewer to see which platform they came from**, their last message, and
  message count. (The exact feature the Market Bubble C-suite asked for.)
- **Command-deck intelligence** — messages/min, live-feed count, per-platform
  chat-mix bar, and a top-chatters leaderboard.
- **Filters that matter** — per-platform toggles, full-text search, and quick
  modes for `@mentions`, `$tickers`, and mods only. `$CASHTAGS` and `@mentions`
  are auto-highlighted inline.
- **Pause-on-scroll** — scroll up to read; the feed freezes and shows a
  "jump to live" pill with the count of messages you missed.
- **Demo mode** — synthetic-but-believable crypto-stream chatter across all three
  sources so the deck is alive the instant it opens (on by default).

## How sourcing works (honest by design)

| Platform | Mode | Mechanism |
|----------|------|-----------|
| **Twitch** | Live read | Anonymous IRC-over-WebSocket (`justinfan`). No auth, fully client-side, real-time. |
| **Kick** | Live read | Pusher socket on `chatrooms.{id}.v2`. A server route resolves the chatroom id; Kick's REST sits behind Cloudflare, so if auto-resolve is blocked you can paste the chatroom id manually. |
| **X** | Replay | X exposes **no public realtime API** for live-broadcast / Space chat. The connector implements the same interface as the others, so a paid X filtered-stream relay (over replies) can be dropped in later. Until then it runs a labeled replay. |

Toggle **Demo OFF** and add a live Twitch channel (e.g. `xqc`) to see real chat
ingested instantly.

## Run locally

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## Build

```bash
pnpm build && pnpm start
```

## Deploy to Vercel

The app is a static Next.js page plus one dynamic route (`/api/kick/[slug]`),
so it deploys to Vercel with zero config:

```bash
vercel login      # one time
vercel            # preview
vercel --prod     # production
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Zustand ·
`@tanstack/react-virtual` · lucide-react. No backend state — every connector runs
in the browser, so it scales to zero and starts instantly.

## Architecture

```
src/
  lib/
    connectors/      twitch.ts · kick.ts · x.ts · demo.ts (shared Connector interface)
    store.ts         Zustand deck state + batched (~12fps) message ingestion
    types.ts         Platform meta, ChatMessage, connection state
    sound.ts         throttled WebAudio cue for high-signal messages
  app/
    api/kick/[slug]  Cloudflare-best-effort chatroom resolver
    page.tsx         renders the Deck
  components/        TopBar · ChannelManager · UnifiedFeed · StreamWatch ·
                     StatsDeck · AudiencePanel · DemoStage · SourceLegend ...
```

Messages from every source normalize to one `ChatMessage` shape, get buffered and
flushed on a timer (so a hype-spike doesn't thrash React), and render through a
virtualized list that sticks to the bottom until you scroll.
