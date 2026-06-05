"use client";

import { useMemo } from "react";
import { Activity, MessageSquare, Users } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import {
  useDeck,
  getRatePerMin,
  platformShare,
  topChatters,
} from "@/lib/store";
import { PLATFORMS, PLATFORM_LIST } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { PlatformIcon } from "./icons";

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="panel-inset flex flex-col gap-1 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-faint">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span
        className="mono text-xl font-semibold leading-none"
        style={{ color: accent ?? "var(--color-fg)" }}
      >
        {value}
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
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat
          icon={<MessageSquare className="h-3 w-3" />}
          label="Messages"
          value={formatNumber(total)}
        />
        <Stat
          icon={<Activity className="h-3 w-3" />}
          label="Msgs / min"
          value={formatNumber(rate)}
          accent="#2ee6a6"
        />
        <Stat
          icon={<Users className="h-3 w-3" />}
          label="Live feeds"
          value={String(liveCount)}
          accent="#b16cff"
        />
      </div>

      {/* Platform share bar */}
      <div className="panel-inset flex flex-col gap-2 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-faint">
            Chat mix
          </span>
          {totalViewers > 0 && (
            <span className="mono text-[10px] text-faint">
              {formatNumber(totalViewers)} viewers
            </span>
          )}
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/5">
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
        <div className="flex items-center justify-between gap-2">
          {PLATFORM_LIST.map((p) => {
            const pct = Math.round((share[p] / shareTotal) * 100);
            return (
              <div key={p} className="flex items-center gap-1.5">
                <PlatformIcon
                  platform={p}
                  className="h-3 w-3"
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

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
        Top chatters
      </h3>
      {chatters.length === 0 ? (
        <p className="text-[11px] text-faint">No chatters yet.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {chatters.map((c, i) => {
            const meta = PLATFORMS[c.platform];
            return (
              <div
                key={`${c.platform}:${c.username}`}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-white/[0.03]"
              >
                <span className="mono w-4 text-center text-[11px] text-faint">
                  {i + 1}
                </span>
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-md"
                  style={{ background: meta.tint, color: meta.accent }}
                >
                  <PlatformIcon platform={c.platform} className="h-2.5 w-2.5" />
                </span>
                <span
                  className="flex-1 truncate text-xs font-medium"
                  style={{ color: c.color }}
                >
                  {c.displayName}
                </span>
                <span className="mono text-[11px] text-dim">{c.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
