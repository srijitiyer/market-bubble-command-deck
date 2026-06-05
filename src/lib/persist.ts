"use client";

import type { Platform } from "./types";

// Lightweight localStorage persistence. Two concerns:
//  1. Kick chatroom-id cache (slug -> id) so a manually-entered id is reused
//     forever, even across reloads / re-adds — Kick ids never change.
//  2. Session restore: the user's channels + demo/sound prefs.

const KICK_IDS_KEY = "mb-deck.kick-ids.v1";
const SESSION_KEY = "mb-deck.session.v1";

function safeGet(key: string): string | null {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    if (typeof window !== "undefined") localStorage.setItem(key, value);
  } catch {
    // ignore quota / privacy-mode errors
  }
}

// --- Kick id cache ---------------------------------------------------------
export function loadKickId(slug: string): number | undefined {
  const raw = safeGet(KICK_IDS_KEY);
  if (!raw) return undefined;
  try {
    const map = JSON.parse(raw) as Record<string, number>;
    return map[slug.toLowerCase()];
  } catch {
    return undefined;
  }
}

export function saveKickId(slug: string, id: number) {
  const raw = safeGet(KICK_IDS_KEY);
  let map: Record<string, number> = {};
  if (raw) {
    try {
      map = JSON.parse(raw);
    } catch {
      map = {};
    }
  }
  map[slug.toLowerCase()] = id;
  safeSet(KICK_IDS_KEY, JSON.stringify(map));
}

// --- session ---------------------------------------------------------------
export interface PersistedChannel {
  platform: Platform;
  channel: string;
  chatroomId?: number;
}
export interface PersistedSession {
  channels: PersistedChannel[];
  demoMode: boolean;
  soundOn: boolean;
}

export function loadSession(): PersistedSession | null {
  const raw = safeGet(SESSION_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as PersistedSession;
    if (!Array.isArray(s.channels)) return null;
    return s;
  } catch {
    return null;
  }
}

export function saveSession(session: PersistedSession) {
  safeSet(SESSION_KEY, JSON.stringify(session));
}
