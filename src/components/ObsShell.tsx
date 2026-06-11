"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useDeck } from "@/lib/store";
import type { Platform } from "@/lib/types";

// Shared boot for the OBS browser-source overlays (/obs/*). Renders on a fully
// transparent page (no nav, no panels unless framed) so the show's production
// team can drop our chat / odds / leaderboard straight into their OBS scenes.
//
// Query options (all optional):
//   mock=0          real connectors only (default mock=1: synthetic traffic so
//                   a scene can be laid out without a live stream)
//   channels=twitch:xqc,kick:foo   override the default marketbubble sources
//   platforms=twitch,kick          filter what the chat overlay shows
//   host=ansem|banks               narrow to one host's room
//   limit=12        rows/cards to render
//   framed=0        remove the glass panel behind odds/leaderboard

export interface ObsOpts {
  mock: boolean;
  platforms: Set<Platform>;
  host: string;
  limit: number;
  framed: boolean;
}

const DEFAULT_CHANNELS: { platform: Platform; channel: string }[] = [
  { platform: "twitch", channel: "marketbubble" },
  { platform: "kick", channel: "marketbubble" },
  { platform: "x", channel: "marketbubble" },
];

export function useObsBoot(): ObsOpts | null {
  const [opts, setOpts] = useState<ObsOpts | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("obs");
    const p = new URLSearchParams(window.location.search);
    const mock = p.get("mock") !== "0";
    const platforms = new Set<Platform>(
      (p.get("platforms") || "twitch,kick,x")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s): s is Platform => s === "twitch" || s === "kick" || s === "x"),
    );
    const host = (p.get("host") || "").toLowerCase();
    const limit = Math.max(1, Math.min(40, parseInt(p.get("limit") || "12", 10) || 12));
    const framed = p.get("framed") !== "0";

    const st = useDeck.getState();
    if (st.demoMode !== mock) st.toggleDemo();
    const channels = (p.get("channels") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [platform, channel] = s.split(":");
        return { platform: platform as Platform, channel };
      })
      .filter(
        (c) =>
          (c.platform === "twitch" || c.platform === "kick" || c.platform === "x") &&
          c.channel,
      );
    for (const c of channels.length ? channels : DEFAULT_CHANNELS) {
      st.addChannel(c.platform, c.channel);
    }
    if (mock) useDeck.getState().seedDemoHistory();

    // defer so the first paint isn't a sync setState inside the effect
    const id = setTimeout(() => setOpts({ mock, platforms, host, limit, framed }), 0);
    return () => {
      clearTimeout(id);
      document.documentElement.classList.remove("obs");
    };
  }, []);

  return opts;
}

// Optional glass panel wrapper (framed=0 removes it for bare compositing).
export function ObsFrame({ framed, children }: { framed: boolean; children: ReactNode }) {
  if (!framed) return <div className="p-2">{children}</div>;
  return (
    <div className="panel m-2 p-4" style={{ background: "rgba(13,13,13,0.82)" }}>
      {children}
    </div>
  );
}
