import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

export function formatClock(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

import type { Platform } from "./types";

// Link to a user's profile / a channel page on its platform.
export function profileUrl(platform: Platform, username: string): string {
  const u = username.replace(/^[@#]/, "");
  if (platform === "twitch") return `https://twitch.tv/${u}`;
  if (platform === "kick") return `https://kick.com/${u}`;
  return `https://x.com/${u}`;
}

// Curated username palette: one family at fixed lightness (~74%) and saturation
// (~50%) so names read as a set, not a rainbow. All pass 4.5:1 on the dark bg.
// Warm, low-saturation earth tones so names sit inside the cream/gold/black
// brand instead of reading as a neon rainbow.
const USERNAME_COLORS = [
  "#c4917a", // terracotta
  "#c6a86e", // ochre
  "#aca873", // olive
  "#94ad8c", // sage
  "#7fa8a0", // muted teal
  "#85a0bd", // slate blue
  "#ad94b0", // muted mauve
  "#c592a0", // dusty rose
  "#b6a085", // taupe
  "#cbac72", // gold
  "#a0b0a0", // grey sage
  "#bfa0ac", // dusty pink
];

// Deterministic color from a string (stable per-username from the curated set)
export function colorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USERNAME_COLORS[Math.abs(hash) % USERNAME_COLORS.length];
}

// Pull any user-supplied hex (e.g. Twitch's neon IRC colors) into our family
// band: keep the hue, cap saturation and clamp lightness for contrast on dark.
// This is the trick that stops the feed looking like a rainbow ransom note.
export function normalizeUserColor(hex: string): string {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  const cs = Math.min(s, 0.38); // hard cap saturation so neon names calm down
  const cl = 0.66 + 0.1 * l; // map any lightness into ~0.66-0.76
  return `hsl(${Math.round(h * 360)} ${Math.round(cs * 100)}% ${Math.round(cl * 100)}%)`;
}
