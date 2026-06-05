"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useDeck,
  getRatePerMin,
  platformShare,
  topChatters,
} from "@/lib/store";
import { PLATFORMS, PLATFORM_LIST } from "@/lib/types";
import { formatNumber, profileUrl } from "@/lib/utils";
import { PlatformIcon } from "./icons";
import { AnimatedNumber } from "./AnimatedNumber";

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <span
        className="mono text-[19px] font-semibold leading-none tracking-tight"
        style={{ color: accent ?? "var(--color-fg)" }}
      >
        <AnimatedNumber value={value} format={formatNumber} />
      </span>
    </div>
  );
}

export function StatsDeck() {
  const rate = useDeck(getRatePerMin);
  const total = useDeck((s) => s.totalMessages);
  const connections = useDeck((s) => s.connections);
  const share = useDeck(useShallow(platformShare));
  const totalViewers = useDeck((s) =>
    s.channels.reduce((sum, c) => sum + (c.viewers ?? 0), 0),
  );

  const liveCount = Object.values(connections).filter(
    (c) => c.state === "connected",
  ).length;
  const shareTotal = Math.max(
    1,
    PLATFORM_LIST.reduce((s, p) => s + share[p], 0),
  );

  return (
    <div className="flex flex-col gap-3.5">
      {/* KPI strip — no boxes, hairline-separated */}
      <div className="flex items-stretch">
        <Kpi label="Messages" value={total} />
        <div className="mx-3 w-px bg-border" />
        <Kpi label="Msgs / min" value={rate} accent="var(--color-pos)" />
        <div className="mx-3 w-px bg-border" />
        {totalViewers > 0 ? (
          <Kpi label="Viewers" value={totalViewers} />
        ) : (
          <Kpi label="Feeds" value={liveCount} />
        )}
      </div>

      {/* chat mix */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Chat mix</span>
        </div>
        <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full">
          {PLATFORM_LIST.map((p) => {
            const pct = (share[p] / shareTotal) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={p}
                style={{ width: `${pct}%`, background: PLATFORMS[p].accent }}
                className="h-full transition-all duration-500"
              />
            );
          })}
        </div>
        <div className="flex items-center gap-4">
          {PLATFORM_LIST.map((p) => {
            const pct = Math.round((share[p] / shareTotal) * 100);
            return (
              <div key={p} className="flex items-center gap-1.5">
                <PlatformIcon
                  platform={p}
                  className="h-2.5 w-2.5"
                  style={{ color: PLATFORMS[p].accent }}
                />
                <span className="mono text-[11px] text-dim">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TopChatters() {
  const messages = useDeck((s) => s.messages);
  const chatters = useMemo(
    () => topChatters({ messages } as Parameters<typeof topChatters>[0], 6),
    [messages],
  );
  const maxCount = chatters[0]?.count ?? 1;

  return (
    <div className="flex flex-col gap-2.5">
      <span className="eyebrow">Top chatters</span>
      {chatters.length === 0 ? (
        <p className="text-[11px] text-faint">No chatters yet.</p>
      ) : (
        <div className="flex flex-col gap-px">
          {chatters.map((c, i) => {
            const meta = PLATFORMS[c.platform];
            return (
              <a
                key={`${c.platform}:${c.username}`}
                href={profileUrl(c.platform, c.username)}
                target="_blank"
                rel="noreferrer"
                className="group relative flex items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-white/[0.03]"
                title={`@${c.username} on ${meta.name}`}
              >
                <span className="mono w-3 text-center text-[11px] text-faint">
                  {i + 1}
                </span>
                <PlatformIcon
                  platform={c.platform}
                  className="h-3 w-3 shrink-0"
                  style={{ color: meta.accent }}
                />
                <span
                  className="min-w-0 flex-1 truncate text-xs font-medium group-hover:underline"
                  style={{ color: c.color }}
                >
                  {c.displayName}
                </span>
                <span className="flex w-20 items-center gap-2">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                      className="block h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(8, (c.count / maxCount) * 100)}%`,
                        background: meta.accent,
                        opacity: 0.55,
                      }}
                    />
                  </span>
                  <span className="mono w-4 shrink-0 text-right text-[11px] text-dim">
                    {c.count}
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
