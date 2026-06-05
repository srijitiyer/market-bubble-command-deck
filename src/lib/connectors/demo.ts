import type { Badge, ChatMessage, Platform } from "@/lib/types";
import { colorFromString } from "@/lib/utils";
import { extractEntities, uid } from "./base";

// Synthetic but believable crypto-livestream chatter. Used for (a) the X feed,
// which has no public realtime chat API, and (b) an optional "demo" overlay so
// the command deck always looks live during a pitch even when no real stream is
// running. Cadence and tone are tuned per-platform to feel real.

const USERNAMES = [
  "degenmike", "sol_sniper", "pumpfiend", "0xwhale", "chartwizard", "moonboi42",
  "liquidated_again", "gm_gn_gm", "bagholder", "apeordie", "ngmi_ser", "wagmi_andy",
  "rugpull_radar", "exitliquidity", "topblast", "candle_god", "fomo_frank",
  "diamondhandz", "papermario", "sendit_sam", "vibecoder", "based_dev", "anon1337",
  "greenwojak", "redwojak", "tape_reader", "scalp_king", "hodlene", "leverage_lord",
  "memecoin_mae", "floor_is_lava", "intern", "the_quant", "satoshis_cousin",
  "bubblewatcher", "treyce_fan", "jackcrypto", "csuite_stan", "chad_thundercock",
  "lowcap_larry", "perp_dealer", "funding_rate", "alpha_leaker", "copytrader",
];

const TICKERS = ["BUBBLE", "SOL", "BTC", "ETH", "PUMP", "WIF", "BONK", "DEGEN", "MOG", "POPCAT"];

const MESSAGES = [
  "this is actually so bullish",
  "send it",
  "wen moon",
  "$BUBBLE looking primed ngl",
  "who's still holding from the launch",
  "LFG 🚀",
  "chat is this real",
  "down bad rn",
  "buy the dip",
  "this stream is elite",
  "the UI on this dashboard is insane",
  "first time catching the stream live LETS GO",
  "gm degens",
  "+EV for many reasons",
  "treyce cooking again",
  "kick chat is wild today",
  "twitch gang where you at",
  "X crew assemble",
  "we are so back",
  "it's over",
  "no it's not over we're so back",
  "hover over the viewers that feature is clean",
  "unified chat is genius why did nobody do this sooner",
  "$SOL about to send",
  "5x from here easy",
  "this the alpha channel fr",
  "someone clip that",
  "audio cutting for anyone else?",
  "nah audio fine on kick",
  "chat moving too fast lol",
  "100x or nothing",
  "watching from 3 platforms at once now haha",
  "the source labels are so useful",
  "who built this? hire them",
  "market bubble c-suite assemble",
  "🫧🫧🫧",
  "ratio",
  "based",
  "ser this is a wendys",
  "i'm all in",
  "paper hands ngmi",
  "real ones know",
  "vibe code challenge winner right here",
  "ROI on this is crazy",
  "GG",
  "sheeeesh",
  "bullish on the team",
  "love the live viewer map",
];

// Real global emote names (7TV / BTTV / Twitch first-party) so they render as
// actual emote images in the feed.
const EMOTES_TWITCH = ["Kappa", "PogChamp", "LUL", "monkaS", "EZ", "Clap", "SeemsGood", "Kreygasm"];
const EMOTES_KICK = ["LuL", "FeelsGoodMan", "WAYTOODANK", "peepoHappy", "AYAYA", "FeelsStrongMan", "haHAA"];

const PLATFORM_BADGES: Record<Platform, Badge[][]> = {
  twitch: [
    [],
    [{ type: "subscriber" }],
    [{ type: "subscriber" }, { type: "moderator" }],
    [{ type: "vip" }],
    [{ type: "broadcaster" }],
  ],
  kick: [
    [],
    [{ type: "subscriber" }],
    [{ type: "og" }],
    [{ type: "moderator" }],
    [{ type: "founder" }],
  ],
  x: [
    [],
    [{ type: "verified" }],
    [{ type: "verified" }, { type: "subscriber" }],
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function makeDemoMessage(platform: Platform, channel: string): ChatMessage {
  const username = pick(USERNAMES) + (Math.random() < 0.3 ? Math.floor(Math.random() * 99) : "");
  let text = pick(MESSAGES);

  // Occasionally splice in a ticker or platform emote for texture.
  if (Math.random() < 0.18) text += ` $${pick(TICKERS)}`;
  if (platform === "twitch" && Math.random() < 0.25) text += ` ${pick(EMOTES_TWITCH)}`;
  if (platform === "kick" && Math.random() < 0.25) text += ` ${pick(EMOTES_KICK)}`;
  if (Math.random() < 0.08) text += " @treyce";

  const badges = pick(PLATFORM_BADGES[platform]);
  const { mentions, tickers } = extractEntities(text);

  return {
    id: uid(platform),
    platform,
    channel,
    username,
    displayName: username,
    color: colorFromString(username),
    text,
    badges,
    timestamp: Date.now(),
    isMod: badges.some((b) => b.type === "moderator"),
    isSub: badges.some((b) => b.type === "subscriber" || b.type === "founder"),
    isVip: badges.some((b) => b.type === "vip"),
    isBroadcaster: badges.some((b) => b.type === "broadcaster"),
    mentions,
    tickers,
  };
}

// Drives a callback at a jittered, human-ish cadence. Returns a stop fn.
export function startDemoStream(
  platform: Platform,
  channel: string,
  onMessage: (m: ChatMessage) => void,
  opts: { minMs?: number; maxMs?: number } = {},
): () => void {
  const minMs = opts.minMs ?? 700;
  const maxMs = opts.maxMs ?? 2600;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;

  const tick = () => {
    if (stopped) return;
    // Occasional bursts (2-4 msgs) to mimic hype moments.
    const burst = Math.random() < 0.2 ? 1 + Math.floor(Math.random() * 3) : 1;
    for (let i = 0; i < burst; i++) {
      setTimeout(() => !stopped && onMessage(makeDemoMessage(platform, channel)), i * 120);
    }
    const delay = minMs + Math.random() * (maxMs - minMs);
    timer = setTimeout(tick, delay);
  };

  timer = setTimeout(tick, Math.random() * maxMs);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
