"use client";

import { create } from "zustand";
import type {
  ChatMessage,
  ConnectionInfo,
  ConnectionState,
  Platform,
  StreamChannel,
} from "./types";
import { PLATFORM_LIST } from "./types";
import type { Connector } from "./connectors/base";
import { extractEntities } from "./connectors/base";
import { TwitchConnector } from "./connectors/twitch";
import { KickConnector } from "./connectors/kick";
import { XConnector } from "./connectors/x";
import { startDemoStream } from "./connectors/demo";
import { blip, unlockAudio } from "./sound";
import { fetchTwitchMeta } from "./twitchMeta";

const MAX_MESSAGES = 600;
const RATE_WINDOW_MS = 60_000;

export interface Filters {
  platforms: Record<Platform, boolean>;
  search: string;
  mode: "all" | "mentions" | "tickers" | "mods";
}

interface DeckState {
  channels: StreamChannel[];
  connections: Record<string, ConnectionInfo>;
  messages: ChatMessage[];
  totalByPlatform: Record<Platform, number>;
  totalMessages: number;
  recentTimestamps: number[];
  filters: Filters;
  paused: boolean;
  demoMode: boolean;
  soundOn: boolean;
  activeStream: string | null; // key of channel being watched large

  // actions
  addChannel: (
    platform: Platform,
    channel: string,
    opts?: { chatroomId?: number },
  ) => void;
  removeChannel: (platform: Platform, channel: string) => void;
  connectChannel: (platform: Platform, channel: string) => void;
  disconnectChannel: (platform: Platform, channel: string) => void;
  connectAll: () => void;
  disconnectAll: () => void;
  ingest: (msg: ChatMessage) => void;
  clearMessages: () => void;
  setSearch: (s: string) => void;
  togglePlatformFilter: (p: Platform) => void;
  setMode: (m: Filters["mode"]) => void;
  setPaused: (p: boolean) => void;
  toggleDemo: () => void;
  toggleSound: () => void;
  setActiveStream: (key: string | null) => void;
  refreshMeta: () => void;
  broadcast: (text: string) => void;
}

export const channelKey = (platform: Platform, channel: string) =>
  `${platform}:${channel.toLowerCase()}`;

// Connector + demo-timer instances live outside React so they never trigger
// renders. The store only holds serialisable connection metadata.
const connectors = new Map<string, Connector>();
const demoTimers = new Map<string, () => void>();

// Batched ingestion: connectors fire fast; we buffer and flush on a timer so
// the message list re-renders at a steady ~12fps instead of per-message.
let buffer: ChatMessage[] = [];
let flushScheduled = false;

function scheduleFlush(get: () => DeckState, set: SetFn) {
  if (flushScheduled) return;
  flushScheduled = true;
  setTimeout(() => {
    flushScheduled = false;
    if (!buffer.length) return;
    const incoming = buffer;
    buffer = [];
    const state = get();
    if (state.paused) {
      // While paused we still count + keep stats but cap the held backlog.
      applyStats(incoming, set, get);
      // keep messages array as-is (frozen view) but stash newest so resume shows them
    }
    const merged = state.paused
      ? state.messages
      : [...state.messages, ...incoming].slice(-MAX_MESSAGES);
    if (!state.paused) {
      set({ messages: merged });
      applyStats(incoming, set, get);
    }
    // Audio cue for high-signal traffic (broadcaster/mod or mentions).
    if (state.soundOn && incoming.some((m) => m.isBroadcaster || m.isMod)) {
      blip();
    }
  }, 80);
}

type SetFn = (
  partial: Partial<DeckState> | ((s: DeckState) => Partial<DeckState>),
) => void;

function applyStats(incoming: ChatMessage[], set: SetFn, get: () => DeckState) {
  const s = get();
  const totalByPlatform = { ...s.totalByPlatform };
  for (const m of incoming) totalByPlatform[m.platform] += 1;
  const now = Date.now();
  const recent = [...s.recentTimestamps, ...incoming.map((m) => m.timestamp)]
    .filter((t) => now - t < RATE_WINDOW_MS)
    .slice(-2000);
  // bump per-connection message counts
  const connections = { ...s.connections };
  for (const m of incoming) {
    const k = channelKey(m.platform, m.channel);
    if (connections[k]) {
      connections[k] = {
        ...connections[k],
        messageCount: connections[k].messageCount + 1,
      };
    }
  }
  set({
    totalByPlatform,
    totalMessages: s.totalMessages + incoming.length,
    recentTimestamps: recent,
    connections,
  });
}

const emptyByPlatform = (): Record<Platform, number> => ({
  twitch: 0,
  kick: 0,
  x: 0,
});

function makeConnector(
  platform: Platform,
  channel: string,
  onMessage: (m: ChatMessage) => void,
  onState: (s: ConnectionState, e?: string) => void,
  chatroomId?: number,
): Connector {
  const cb = { onMessage, onState };
  if (platform === "twitch") return new TwitchConnector(channel, cb);
  if (platform === "kick") return new KickConnector(channel, cb, chatroomId);
  return new XConnector(channel, cb);
}

export const useDeck = create<DeckState>((set, get) => ({
  channels: [],
  connections: {},
  messages: [],
  totalByPlatform: emptyByPlatform(),
  totalMessages: 0,
  recentTimestamps: [],
  filters: {
    platforms: { twitch: true, kick: true, x: true },
    search: "",
    mode: "all",
  },
  paused: false,
  demoMode: true,
  soundOn: false,
  activeStream: null,

  addChannel: (platform, channel, opts) => {
    const clean = channel.toLowerCase().replace(/^[#@]/, "").trim();
    if (!clean) return;
    const key = channelKey(platform, clean);
    if (get().channels.some((c) => channelKey(c.platform, c.channel) === key))
      return;
    set((s) => ({
      channels: [
        ...s.channels,
        { platform, channel: clean, isLive: false, chatroomId: opts?.chatroomId },
      ],
      connections: {
        ...s.connections,
        [key]: {
          platform,
          channel: clean,
          state: "idle",
          messageCount: 0,
        },
      },
      activeStream: s.activeStream ?? key,
    }));
    get().connectChannel(platform, clean);
  },

  removeChannel: (platform, channel) => {
    const key = channelKey(platform, channel);
    get().disconnectChannel(platform, channel);
    set((s) => {
      const connections = { ...s.connections };
      delete connections[key];
      const channels = s.channels.filter(
        (c) => channelKey(c.platform, c.channel) !== key,
      );
      return {
        channels,
        connections,
        activeStream:
          s.activeStream === key
            ? channels.length
              ? channelKey(channels[0].platform, channels[0].channel)
              : null
            : s.activeStream,
      };
    });
  },

  connectChannel: (platform, channel) => {
    const key = channelKey(platform, channel);
    const { demoMode } = get();

    const setConnState = (state: ConnectionState, error?: string) =>
      set((s) => ({
        connections: {
          ...s.connections,
          [key]: {
            ...(s.connections[key] ?? {
              platform,
              channel,
              messageCount: 0,
            }),
            platform,
            channel,
            state,
            error,
            connectedAt:
              state === "connected"
                ? (s.connections[key]?.connectedAt ?? Date.now())
                : s.connections[key]?.connectedAt,
          },
        },
      }));

    // tear down anything existing for this key
    connectors.get(key)?.disconnect();
    connectors.delete(key);
    demoTimers.get(key)?.();
    demoTimers.delete(key);

    if (demoMode) {
      setConnState("connected");
      const stop = startDemoStream(platform, channel, (m) => {
        buffer.push(m);
        scheduleFlush(get, set);
      });
      demoTimers.set(key, stop);
      return;
    }

    const chatroomId = get().channels.find(
      (c) => channelKey(c.platform, c.channel) === key,
    )?.chatroomId;
    const connector = makeConnector(
      platform,
      channel,
      (m) => {
        buffer.push(m);
        scheduleFlush(get, set);
      },
      setConnState,
      chatroomId,
    );
    connectors.set(key, connector);
    connector.connect();
  },

  disconnectChannel: (platform, channel) => {
    const key = channelKey(platform, channel);
    connectors.get(key)?.disconnect();
    connectors.delete(key);
    demoTimers.get(key)?.();
    demoTimers.delete(key);
    set((s) => ({
      connections: s.connections[key]
        ? {
            ...s.connections,
            [key]: { ...s.connections[key], state: "idle" },
          }
        : s.connections,
    }));
  },

  connectAll: () => {
    for (const c of get().channels) get().connectChannel(c.platform, c.channel);
  },

  disconnectAll: () => {
    for (const c of get().channels)
      get().disconnectChannel(c.platform, c.channel);
  },

  ingest: (msg) => {
    buffer.push(msg);
    scheduleFlush(get, set);
  },

  clearMessages: () =>
    set({
      messages: [],
      recentTimestamps: [],
    }),

  setSearch: (search) =>
    set((s) => ({ filters: { ...s.filters, search } })),

  togglePlatformFilter: (p) =>
    set((s) => ({
      filters: {
        ...s.filters,
        platforms: { ...s.filters.platforms, [p]: !s.filters.platforms[p] },
      },
    })),

  setMode: (mode) => set((s) => ({ filters: { ...s.filters, mode } })),

  setPaused: (paused) => set({ paused }),

  toggleDemo: () => {
    const next = !get().demoMode;
    // reconnect every channel under the new mode
    get().disconnectAll();
    set({ demoMode: next });
    // small delay so sockets close cleanly
    setTimeout(() => get().connectAll(), 120);
  },

  toggleSound: () => {
    const next = !get().soundOn;
    if (next) {
      unlockAudio();
      blip(660);
    }
    set({ soundOn: next });
  },

  setActiveStream: (key) => set({ activeStream: key }),

  broadcast: (text) => {
    const clean = text.trim();
    if (!clean) return;
    const { mentions, tickers } = extractEntities(clean);
    const msg: ChatMessage = {
      id: `host_${Date.now()}`,
      platform: "twitch", // nominal; host messages render distinctly via isHost
      channel: "shared",
      username: "MarketBubble",
      displayName: "Market Bubble",
      color: "#b88bff",
      text: clean,
      badges: [{ type: "broadcaster" }],
      timestamp: Date.now(),
      isBroadcaster: true,
      isHost: true,
      mentions,
      tickers,
    };
    buffer.push(msg);
    scheduleFlush(get, set);
  },

  refreshMeta: () => {
    // Real Twitch stream metadata (live/viewers/title). Demo mode shows
    // synthetic stages, so skip the network calls there.
    if (get().demoMode) return;
    for (const c of get().channels) {
      if (c.platform !== "twitch") continue;
      const key = channelKey(c.platform, c.channel);
      void fetchTwitchMeta(c.channel).then((meta) => {
        if (!meta) return;
        set((s) => ({
          channels: s.channels.map((ch) =>
            channelKey(ch.platform, ch.channel) === key
              ? { ...ch, isLive: meta.isLive, viewers: meta.viewers, title: meta.title }
              : ch,
          ),
        }));
      });
    }
  },
}));

// --- selectors -------------------------------------------------------------

export function getRatePerMin(state: DeckState): number {
  const now = Date.now();
  return state.recentTimestamps.filter((t) => now - t < RATE_WINDOW_MS).length;
}

export function filterMessages(state: DeckState): ChatMessage[] {
  const { filters } = state;
  const q = filters.search.trim().toLowerCase();
  return state.messages.filter((m) => {
    if (m.isHost) return q ? m.text.toLowerCase().includes(q) : true;
    if (!filters.platforms[m.platform]) return false;
    if (filters.mode === "mentions" && !(m.mentions && m.mentions.length))
      return false;
    if (filters.mode === "tickers" && !(m.tickers && m.tickers.length))
      return false;
    if (filters.mode === "mods" && !(m.isMod || m.isBroadcaster)) return false;
    if (q) {
      const hay = (m.text + " " + m.displayName).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export interface ChatterStat {
  username: string;
  displayName: string;
  platform: Platform;
  color: string;
  count: number;
}

export function topChatters(state: DeckState, limit = 6): ChatterStat[] {
  const map = new Map<string, ChatterStat>();
  for (const m of state.messages) {
    const key = `${m.platform}:${m.username}`;
    const ex = map.get(key);
    if (ex) ex.count += 1;
    else
      map.set(key, {
        username: m.username,
        displayName: m.displayName,
        platform: m.platform,
        color: m.color,
        count: 1,
      });
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export function platformShare(state: DeckState): Record<Platform, number> {
  const counts = emptyByPlatform();
  for (const m of state.messages) counts[m.platform] += 1;
  return counts;
}

export { PLATFORM_LIST };
