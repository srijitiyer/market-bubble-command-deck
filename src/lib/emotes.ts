"use client";

// Real inline emotes. We load 7TV + BTTV global emote sets (CORS-open, no auth)
// and a handful of iconic Twitch first-party emotes, then word-match chat tokens
// to image URLs. Covers most globals that appear in real Twitch/Kick chat and
// makes the demo feed render actual emote images instead of plain text.

export interface Emote {
  url: string;
  // most 1x emotes are ~28px tall; we render at line height
  zeroWidth?: boolean;
}

const emoteMap = new Map<string, Emote>();
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

// Iconic Twitch first-party emotes by stable id.
const TWITCH_FIRST_PARTY: Record<string, string> = {
  Kappa: "25",
  LUL: "425618",
  PogChamp: "305954156",
  Kreygasm: "41",
  BibleThump: "86",
  ResidentSleeper: "245",
  NotLikeThis: "58765",
  SeemsGood: "64138",
};

function twitchUrl(id: string) {
  return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;
}

export function getEmote(name: string): Emote | undefined {
  return emoteMap.get(name);
}

export function onEmotesLoaded(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function loadEmotes(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (loading) return loading;
  loading = (async () => {
    // seed first-party immediately
    for (const [name, id] of Object.entries(TWITCH_FIRST_PARTY)) {
      emoteMap.set(name, { url: twitchUrl(id) });
    }
    await Promise.allSettled([
      fetch("https://7tv.io/v3/emote-sets/global")
        .then((r) => r.json())
        .then((d: { emotes?: Array<{ name: string; id: string; flags?: number }> }) => {
          for (const e of d.emotes ?? []) {
            emoteMap.set(e.name, {
              url: `https://cdn.7tv.app/emote/${e.id}/2x.webp`,
              zeroWidth: (e.flags ?? 0) === 1,
            });
          }
        }),
      fetch("https://api.betterttv.net/3/cached/emotes/global")
        .then((r) => r.json())
        .then((d: Array<{ code: string; id: string }>) => {
          for (const e of d) {
            // don't let bttv override a 7TV/first-party match
            if (!emoteMap.has(e.code))
              emoteMap.set(e.code, {
                url: `https://cdn.betterttv.net/emote/${e.id}/2x`,
              });
          }
        }),
    ]);
    loaded = true;
    listeners.forEach((fn) => fn());
  })();
  return loading;
}
