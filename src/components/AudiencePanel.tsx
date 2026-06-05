"use client";

import { useMemo, useState } from "react";
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

export function AudiencePanel() {
  const messages = useDeck((s) => s.messages);
  const [hover, setHover] = useState<Viewer | null>(null);

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

  return (
    <div className="relative flex flex-col gap-2.5">
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
              onMouseEnter={() => setHover(v)}
              onMouseLeave={() => setHover((h) => (h === v ? null : h))}
              className="relative flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold transition-transform hover:z-10 hover:scale-110"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: v.color,
                boxShadow: `inset 0 0 0 1.5px ${meta.accent}`,
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

      {hover && (
        <div className="pointer-events-none absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-border-strong bg-overlay p-3 shadow-2xl">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: hover.color,
                boxShadow: `inset 0 0 0 1.5px ${PLATFORMS[hover.platform].accent}`,
              }}
            >
              {hover.displayName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-[13px] font-semibold"
                style={{ color: hover.color }}
              >
                {hover.displayName}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-dim">
                <PlatformIcon
                  platform={hover.platform}
                  className="h-3 w-3"
                  style={{ color: PLATFORMS[hover.platform].accent }}
                />
                {PLATFORMS[hover.platform].name} · #{hover.channel}
              </div>
            </div>
            <div className="flex items-center gap-1 text-faint">
              <span className="mono text-[11px]">{hover.count} msg</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          </div>
          <div className="mt-2 rounded-lg bg-black/30 px-2.5 py-1.5">
            <div className="eyebrow mb-1">last · {formatClock(hover.lastTs)}</div>
            <div className="line-clamp-2 text-[11px] text-[#cfd4dd]">
              {hover.lastText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
