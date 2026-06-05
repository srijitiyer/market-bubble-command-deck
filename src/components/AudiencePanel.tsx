"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ExternalLink } from "lucide-react";
import { useDeck } from "@/lib/store";
import { PLATFORMS, type Platform } from "@/lib/types";
import { formatClock, profileUrl } from "@/lib/utils";
import { PlatformIcon } from "./icons";

interface Viewer {
  username: string;
  displayName: string;
  platform: Platform;
  channel: string;
  color: string;
  count: number;
  lastText: string;
  lastTs: number;
}

interface Hover {
  v: Viewer;
  x: number; // anchor center x (viewport)
  y: number; // anchor top y (viewport)
}

export function AudiencePanel() {
  const messages = useDeck((s) => s.messages);
  const [hover, setHover] = useState<Hover | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const viewers = useMemo(() => {
    const map = new Map<string, Viewer>();
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.isHost) continue;
      const key = `${m.platform}:${m.username}`;
      const ex = map.get(key);
      if (ex) ex.count += 1;
      else
        map.set(key, {
          username: m.username,
          displayName: m.displayName,
          platform: m.platform,
          channel: m.channel,
          color: m.color,
          count: 1,
          lastText: m.text,
          lastTs: m.timestamp,
        });
    }
    return [...map.values()].sort((a, b) => b.lastTs - a.lastTs).slice(0, 56);
  }, [messages]);

  const byPlatform = useMemo(() => {
    const c: Record<Platform, number> = { twitch: 0, kick: 0, x: 0 };
    for (const v of viewers) c[v.platform] += 1;
    return c;
  }, [viewers]);

  const enter = (v: Viewer) => (e: MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover({ v, x: r.left + r.width / 2, y: r.top });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Live audience</span>
        <span className="mono text-[11px] text-faint">
          {viewers.length} active
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {viewers.length === 0 && (
          <span className="text-[11px] text-faint">No active viewers yet.</span>
        )}
        {viewers.map((v) => {
          const meta = PLATFORMS[v.platform];
          return (
            <a
              key={`${v.platform}:${v.username}`}
              href={profileUrl(v.platform, v.username)}
              target="_blank"
              rel="noreferrer"
              onMouseEnter={enter(v)}
              onMouseLeave={() => setHover(null)}
              className="relative flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold transition-transform duration-150 hover:z-10 hover:scale-110"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: v.color,
                boxShadow: `inset 0 0 0 1.5px ${meta.muted}`,
              }}
            >
              {v.displayName.slice(0, 1).toUpperCase()}
            </a>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        {(Object.keys(byPlatform) as Platform[]).map((p) => (
          <div key={p} className="flex items-center gap-1.5">
            <PlatformIcon
              platform={p}
              className="h-2.5 w-2.5"
              style={{ color: PLATFORMS[p].accent }}
            />
            <span className="mono text-[11px] text-dim">{byPlatform[p]}</span>
          </div>
        ))}
      </div>

      {mounted &&
        hover &&
        createPortal(<ViewerCard hover={hover} />, document.body)}
    </div>
  );
}

// A fixed-position card anchored just above the hovered avatar. Rendered in a
// portal so it never gets clipped by the scrolling rail, and flips below the
// avatar if there isn't room above.
function ViewerCard({ hover }: { hover: Hover }) {
  const { v } = hover;
  const meta = PLATFORMS[v.platform];
  const W = 232;
  const below = hover.y < 168; // not enough room above → drop below
  const left = Math.min(
    Math.max(hover.x - W / 2, 10),
    window.innerWidth - W - 10,
  );
  return (
    <div
      className="pointer-events-none fixed z-[100000]"
      style={{
        left,
        top: below ? hover.y + 30 : hover.y - 12,
        width: W,
        transform: below ? "translateY(0)" : "translateY(-100%)",
      }}
    >
      <div
        className="animate-msg-in rounded-xl border border-border-strong bg-overlay p-3 shadow-2xl"
        style={{ boxShadow: "0 16px 44px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.05)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: v.color,
              boxShadow: `inset 0 0 0 1.5px ${meta.muted}`,
            }}
          >
            {v.displayName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-[13px] font-semibold"
              style={{ color: v.color }}
            >
              {v.displayName}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-dim">
              <PlatformIcon
                platform={v.platform}
                className="h-3 w-3"
                style={{ color: meta.accent }}
              />
              {meta.name} · #{v.channel}
            </div>
          </div>
          <div className="flex items-center gap-1 text-faint">
            <span className="mono text-[11px]">{v.count} msg</span>
            <ExternalLink className="h-3 w-3" />
          </div>
        </div>
        <div className="mt-2 rounded-lg bg-black/30 px-2.5 py-1.5">
          <div className="eyebrow mb-1">last · {formatClock(v.lastTs)}</div>
          <div className="line-clamp-2 text-[11px] text-[#cfd4dd]">
            {v.lastText}
          </div>
        </div>
      </div>
    </div>
  );
}
