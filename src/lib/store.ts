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
import { makeDemoMessage, startDemoStream } from "./connectors/demo";
import { blip, unlockAudio } from "./sound";
import { fetchTwitchMeta } from "./twitchMeta";
import {
  loadKickId,
  saveKickId,
  saveSession,
  type PersistedChannel,
} from "./persist";

const MAX_MESSAGES = 600;
const RATE_WINDOW_MS = 60_000;

export interface Filters {
  platforms: Record<Platform, boolean>;
  search: string;
  mode: "all" | "mentions" | "tickers" | "mods" | "hosts";
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
  featured: ChatMessage | null; // message pinned to the featured/overlay slot
  emotesReady: boolean; // flips true once global emote sets load
  viewMode: "stage" | "deck"; // hero broadcast stage vs power-user deck
  section: "live" | "markets" | "leaders"; // top-level nav section
  hostFilter: "all" | string; // stage host switch (e.g. "ansem" | "banks")

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
  seedDemoHistory: () => void;
  clearMessages: () => void;
  setSearch: (s: string) => void;
  togglePlatformFilter: (p: Platform) => void;
  setMode: (m: Filters["mode"]) => void;
  setPaused: (p: boolean) => void;
  toggleDemo: () => void;
  toggleSound: () => void;
  setActiveStream: (key: string | null) => void;
  setViewMode: (m: "stage" | "deck") => void;
  setSection: (s: "live" | "markets" | "leaders") => void;
  setHostFilter: (h: "all" | string) => void;
  refreshMeta: () => void;
  broadcast: (text: string) => void;
  hydrate: (channels: PersistedChannel[], demoMode: boolean, soundOn: boolean) => void;
  setFeatured: (msg: ChatMessage | null) => void;
  setEmotesReady: () => void;
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
    // Always append (even while paused) so resume genuinely scrolls back to the
    // messages that arrived — the "N new" pill then points at real content, and
    // nothing is silently dropped. Pause only freezes autoscroll (UnifiedFeed).
    set({ messages: [...state.messages, ...incoming].slice(-MAX_MESSAGES) });
    applyStats(incoming, set, get);
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

function persist(get: () => DeckState) {
  const s = get();
  saveSession({
    channels: s.channels.map((c) => ({
      platform: c.platform,
      channel: c.channel,
      chatroomId: c.chatroomId,
    })),
    demoMode: s.demoMode,
    soundOn: s.soundOn,
  });
}

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
  featured: null,
  emotesReady: false,
  viewMode: "stage",
  section: "live",
  hostFilter: "all",

  addChannel: (platform, channel, opts) => {
    const clean = channel.toLowerCase().replace(/^[#@]/, "").trim();
    if (!clean) return;
    const key = channelKey(platform, clean);
    if (get().channels.some((c) => channelKey(c.platform, c.channel) === key))
      return;
    // Kick: reuse a cached chatroom id, or remember a freshly-supplied one.
    let chatroomId = opts?.chatroomId;
    if (platform === "kick") {
      if (chatroomId) saveKickId(clean, chatroomId);
      else chatroomId = loadKickId(clean);
    }
    set((s) => ({
      channels: [
        ...s.channels,
        { platform, channel: clean, isLive: false, chatroomId },
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
    persist(get);
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
    persist(get);
  },

  hydrate: (channels, demoMode, soundOn) => {
    set({ demoMode, soundOn });
    for (const c of channels) {
      get().addChannel(c.platform, c.channel, c.chatroomId ? { chatroomId: c.chatroomId } : undefined);
    }
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
    get().seedDemoHistory();
  },

  // Demo mode on an empty deck: backfill a few minutes of believable history so
  // the room reads as established the moment it opens — feed, stats, leaderboard
  // and audience all populated — instead of trickling up from zero.
  seedDemoHistory: () => {
    const s = get();
    if (!s.demoMode || s.messages.length > 0 || !s.channels.length) return;
    const now = Date.now();
    const span = 4 * 60_000;
    const count = 90;
    const backfill: ChatMessage[] = [];
    for (let i = 0; i < count; i++) {
      const ch = s.channels[Math.floor(Math.random() * s.channels.length)];
      const m = makeDemoMessage(ch.platform, ch.channel);
      m.timestamp = now - span + Math.round((span * (i + Math.random())) / count);
      backfill.push(m);
    }
    backfill.sort((a, b) => a.timestamp - b.timestamp);
    const totalByPlatform = emptyByPlatform();
    for (const m of backfill) totalByPlatform[m.platform] += 1;
    set({
      messages: backfill,
      totalMessages: backfill.length,
      totalByPlatform,
      recentTimestamps: backfill
        .map((m) => m.timestamp)
        .filter((t) => now - t < RATE_WINDOW_MS),
    });
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
    // Clear the feed + stats so the new mode starts honest: turning demo OFF
    // must not leave synthetic chatter on screen (real channels may be offline).
    buffer = [];
    set({
      demoMode: next,
      messages: [],
      totalMessages: 0,
      totalByPlatform: { twitch: 0, kick: 0, x: 0 },
      recentTimestamps: [],
      paused: false,
    });
    persist(get);
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
    persist(get);
  },

  setActiveStream: (key) => set({ activeStream: key }),
  setViewMode: (m) => set({ viewMode: m, hostFilter: "all" }),
  setSection: (s) => set({ section: s }),
  setHostFilter: (h) => set({ hostFilter: h }),

  setFeatured: (msg) => set({ featured: msg }),

  setEmotesReady: () => set({ emotesReady: true }),

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
      color: "#b08bf2",
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
  const { filters, hostFilter } = state;
  const q = filters.search.trim().toLowerCase();
  return state.messages.filter((m) => {
    if (m.isHost) return q ? m.text.toLowerCase().includes(q) : true;
    // Stage host switch: narrow to a host's takes + chat talking about them.
    if (hostFilter !== "all") {
      const onHost =
        m.host === hostFilter ||
        m.text.toLowerCase().includes(hostFilter) ||
        m.mentions?.some((x) => x.toLowerCase().includes(hostFilter));
      if (!onHost) return false;
    }
    if (!filters.platforms[m.platform]) return false;
    if (filters.mode === "mentions" && !(m.mentions && m.mentions.length))
      return false;
    if (filters.mode === "tickers" && !(m.tickers && m.tickers.length))
      return false;
    if (filters.mode === "mods" && !(m.isMod || m.isBroadcaster)) return false;
    if (filters.mode === "hosts" && !(m.isBroadcaster || m.isHost)) return false;
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

// Most-mentioned $cashtags across the live feed (what the room is talking about).
export function topCashtags(
  state: DeckState,
  limit = 8,
): { symbol: string; count: number }[] {
  const map = new Map<string, number>();
  for (const m of state.messages) {
    for (const t of m.tickers ?? []) {
      const sym = t.toUpperCase();
      map.set(sym, (map.get(sym) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// Unique chatters currently in the merged buffer (the "active audience" count).
export function activeChatters(state: DeckState): number {
  const set = new Set<string>();
  for (const m of state.messages) {
    if (!m.isHost) set.add(`${m.platform}:${m.username}`);
  }
  return set.size;
}

export interface LeaderRow {
  username: string;
  displayName: string;
  platform: Platform;
  color: string;
  count: number;
  cashtags: number; // $ticker mentions — "moving the market"
}

// Live chat leaderboard: who's driving the conversation right now, ranked by
// message volume, with how many cashtags they've fired. Computed off the real
// merged feed (the competitor's leaderboard is static).
export function chatLeaderboard(state: DeckState, limit = 7): LeaderRow[] {
  const map = new Map<string, LeaderRow>();
  for (const m of state.messages) {
    if (m.isHost) continue;
    const key = `${m.platform}:${m.username}`;
    const ex = map.get(key);
    const tags = m.tickers?.length ?? 0;
    if (ex) {
      ex.count += 1;
      ex.cashtags += tags;
    } else {
      map.set(key, {
        username: m.username,
        displayName: m.displayName,
        platform: m.platform,
        color: m.color,
        count: 1,
        cashtags: tags,
      });
    }
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count || b.cashtags - a.cashtags)
    .slice(0, limit);
}

export { PLATFORM_LIST };
