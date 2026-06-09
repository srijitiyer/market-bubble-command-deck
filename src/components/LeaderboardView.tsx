"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { Crown, DollarSign } from "lucide-react";
import { useDeck, chatLeaderboard, platformShare, activeChatters } from "@/lib/store";
import { PLATFORM_LIST, PLATFORMS } from "@/lib/types";
import { formatNumber, profileUrl } from "@/lib/utils";
import { PlatformIcon } from "./icons";
import { PanelHeader } from "./PanelHeader";
import { CashtagCloud } from "./CashtagCloud";

// Leaderboard section — a full live ranking of who's driving the merged chat,
// computed off the real feed (the competitor's "Top 10 of CT" is a static
// hand-curated card wall; ours updates every second).
export function LeaderboardView() {
  const messages = useDeck((s) => s.messages);
  const rows = useMemo(
    () => chatLeaderboard({ messages } as Parameters<typeof chatLeaderboard>[0], 18),
    [messages],
  );
  const share = useDeck(useShallow(platformShare));
  const chatters = useDeck(activeChatters);
  const shareTotal = Math.max(1, share.twitch + share.kick + share.x);
  const max = Math.max(1, rows[0]?.count ?? 1);

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-y-auto p-3">
      <section className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
        <PanelHeader
          title="Chat Leaderboard"
          aside={
            <span className="eyebrow text-faint">
              {formatNumber(chatters)} chatters · live
            </span>
          }
        />
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-2">
            {rows.length === 0 && (
              <div className="col-span-2 py-10 text-center text-faint">
                Waiting for the room to fill up…
              </div>
            )}
            {rows.map((r, i) => {
              const meta = PLATFORMS[r.platform];
              const top = i < 3;
              return (
                <a
                  key={`${r.platform}:${r.username}`}
                  href={profileUrl(r.platform, r.username)}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 ring-1 ring-border-subtle transition-colors hover:bg-white/[0.03] hover:ring-border"
                >
                  <span
                    className="mono w-5 shrink-0 text-center text-[13px] font-semibold tabular-nums"
                    style={{ color: top ? "var(--color-brand-2)" : "var(--color-fg-faint)" }}
                  >
                    {i + 1}
                  </span>
                  <PlatformIcon
                    platform={r.platform}
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: meta.accent }}
                  />
                  <span
                    className="min-w-0 flex-1 truncate text-[13px] font-medium"
                    style={{ color: r.color }}
                  >
                    {r.displayName}
                  </span>
                  {i === 0 && <Crown className="h-3.5 w-3.5 shrink-0 text-brand-2" />}
                  {r.cashtags > 0 && (
                    <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-brand-2">
                      <DollarSign className="h-3 w-3" />
                      {r.cashtags}
                    </span>
                  )}
                  <span className="hidden h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-white/[0.06] sm:block">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.max(8, (r.count / max) * 100)}%`,
                        background: meta.muted,
                        opacity: 0.75,
                      }}
                    />
                  </span>
                  <span className="mono w-7 shrink-0 text-right text-[12px] tabular-nums text-dim">
                    {r.count}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="flex w-[clamp(280px,24vw,360px)] shrink-0 flex-col gap-3 overflow-y-auto">
        <section className="panel flex flex-col gap-2.5 p-4">
          <span className="eyebrow">Platform split</span>
          <div className="flex h-2 w-full gap-px overflow-hidden rounded-full">
            {PLATFORM_LIST.map((p) =>
              share[p] > 0 ? (
                <div
                  key={p}
                  style={{ width: `${(share[p] / shareTotal) * 100}%`, background: PLATFORMS[p].muted }}
                  className="h-full transition-all duration-500"
                />
              ) : null,
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {PLATFORM_LIST.map((p) => (
              <div key={p} className="flex items-center gap-2 text-[12px]">
                <PlatformIcon platform={p} className="h-3 w-3" style={{ color: PLATFORMS[p].accent }} />
                <span className="flex-1 text-dim">{PLATFORMS[p].name}</span>
                <span className="mono tabular-nums text-faint">
                  {Math.round((share[p] / shareTotal) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel flex flex-col p-4">
          <CashtagCloud />
        </section>
      </aside>
    </div>
  );
}
