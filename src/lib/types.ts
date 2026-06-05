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
  // brand color used for accents / badges
  accent: string;
  // a darker tinted background for chips
  tint: string;
  glow: string;
}

export const PLATFORMS: Record<Platform, PlatformMeta> = {
  twitch: {
    id: "twitch",
    name: "Twitch",
    accent: "#a970ff",
    tint: "rgba(145,70,255,0.14)",
    glow: "rgba(145,70,255,0.45)",
  },
  kick: {
    id: "kick",
    name: "Kick",
    accent: "#53fc18",
    tint: "rgba(83,252,24,0.12)",
    glow: "rgba(83,252,24,0.4)",
  },
  x: {
    id: "x",
    name: "X",
    accent: "#e7e9ea",
    tint: "rgba(231,233,234,0.10)",
    glow: "rgba(120,160,255,0.35)",
  },
};

export const PLATFORM_LIST: Platform[] = ["twitch", "kick", "x"];
