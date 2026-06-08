export type Platform = "twitch" | "kick" | "x";

export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface Badge {
  type: string; // e.g. "moderator", "subscriber", "vip", "broadcaster", "verified"
  label?: string;
}

export interface ChatMessage {
  id: string;
  platform: Platform;
  channel: string; // channel/room the message came from
  userId?: string;
  username: string; // login / handle
  displayName: string; // cased display name
  color: string; // resolved hex/hsl color for the name
  text: string;
  badges: Badge[];
  timestamp: number; // ms epoch
  // Optional flags used for highlighting in the unified feed
  isMod?: boolean;
  isSub?: boolean;
  isVip?: boolean;
  isBroadcaster?: boolean;
  mentions?: string[]; // @handles referenced
  tickers?: string[]; // $TICKER cashtags referenced
  highlighted?: boolean;
  // Host broadcast posted from the unified composer (the "one shared chat").
  isHost?: boolean;
  // Which show host this message belongs to (stage host switch). "ansem"|"banks"
  host?: string;
}

export interface StreamChannel {
  platform: Platform;
  // user-facing slug/handle, lowercase where required by the platform
  channel: string;
  title?: string;
  viewers?: number;
  isLive?: boolean;
  thumbnail?: string;
  game?: string;
  // Kick only: optional manually-supplied chatroom id, used when Cloudflare
  // blocks automatic slug -> chatroom resolution.
  chatroomId?: number;
}

export interface ConnectionInfo {
  platform: Platform;
  channel: string;
  state: ConnectionState;
  error?: string;
  messageCount: number;
  connectedAt?: number;
}

export interface PlatformMeta {
  id: Platform;
  name: string;
  // full-saturation brand color — use ONLY on <=16px glyphs/pips
  accent: string;
  // chroma-capped variant for anything larger (rails, labels, bars, dots)
  muted: string;
  // a darker tinted background for chips
  tint: string;
  glow: string;
}

export const PLATFORMS: Record<Platform, PlatformMeta> = {
  twitch: {
    id: "twitch",
    name: "Twitch",
    accent: "#a892c2",
    muted: "#968aa6",
    tint: "rgba(150,138,166,0.14)",
    glow: "rgba(150,138,166,0.3)",
  },
  kick: {
    id: "kick",
    name: "Kick",
    accent: "#86bd7b",
    muted: "#8aa585",
    tint: "rgba(138,165,133,0.14)",
    glow: "rgba(138,165,133,0.3)",
  },
  x: {
    id: "x",
    name: "X",
    accent: "#d9d5cd",
    muted: "#b4afa6",
    tint: "rgba(217,213,205,0.1)",
    glow: "rgba(217,213,205,0.26)",
  },
};

// Market Bubble show hosts. ("banks has the distribution, ansem has the trade
// flow" — straight from the C-suite brief.) Used by the Stage host switcher.
export interface HostMeta {
  id: string;
  name: string;
  handle: string; // X handle
  role: string;
  accent: string;
}

export const HOSTS: HostMeta[] = [
  { id: "ansem", name: "Ansem", handle: "blknoiz06", role: "the trade flow", accent: "#7fb0a8" },
  { id: "banks", name: "Banks", handle: "fazebanks", role: "the distribution", accent: "#cBa274" },
];

// Show identity (lifted from Market Bubble's own positioning).
export const SHOW = {
  name: "Market Bubble",
  pillars: ["Make Money", "Command Attention", "Leverage AI"],
  motto: "Invest in Yourself",
  schedule: "Live · Thursdays · 1PM PST",
} as const;

export const PLATFORM_LIST: Platform[] = ["twitch", "kick", "x"];
