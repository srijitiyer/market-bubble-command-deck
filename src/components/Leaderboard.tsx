"use client";

import { useMemo } from "react";
import { DollarSign } from "lucide-react";
import { useDeck, chatLeaderboard } from "@/lib/store";
import { PLATFORMS } from "@/lib/types";
import { profileUrl } from "@/lib/utils";
import { PlatformIcon } from "./icons";

// Live chat leaderboard — who's driving the conversation right now, ranked off
// the real merged feed. The competitor's leaderboard is static; ours moves.
// (Computed via useMemo over the stable messages array — returning fresh objects
// through a zustand selector would loop the shallow store comparison.)
export function Leaderboard() {
  const messages = useDeck((s) => s.messages);
  const rows = useMemo(
    () => chatLeaderboard({ messages } as Parameters<typeof chatLeaderboard>[0], 7),
    [messages],
  );
  const max = Math.max(1, rows[0]?.count ?? 1);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Chat leaderboard</span>
        <span className="eyebrow text-faint">live</span>
      </div>

      {rows.length === 0 ? (
        <span className="text-[11px] text-faint">Waiting for chatters…</span>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((r, i) => {
            const meta = PLATFORMS[r.platform];
            return (
              <a
                key={`${r.platform}:${r.username}`}
                href={profileUrl(r.platform, r.username)}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2 rounded-md py-0.5 transition-colors hover:bg-white/[0.03]"
                title={`${r.displayName} on ${meta.name}`}
              >
                <span className="mono w-3 shrink-0 text-right text-[11px] text-faint">
                  {i + 1}
                </span>
                <PlatformIcon
                  platform={r.platform}
                  className="h-3 w-3 shrink-0"
                  style={{ color: meta.accent }}
                />
                <span
                  className="min-w-0 flex-1 truncate text-[12px] font-medium"
                  style={{ color: r.color }}
                >
                  {r.displayName}
                </span>
                {r.cashtags > 0 && (
                  <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-brand-2">
                    <DollarSign className="h-2.5 w-2.5" />
                    {r.cashtags}
                  </span>
                )}
                {/* volume bar */}
                <span className="hidden h-1 w-12 shrink-0 overflow-hidden rounded-full bg-white/[0.06] sm:block">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max(10, (r.count / max) * 100)}%`,
                      background: meta.muted,
                      opacity: 0.7,
                    }}
                  />
                </span>
                <span className="mono w-5 shrink-0 text-right text-[11px] tabular-nums text-dim">
                  {r.count}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
