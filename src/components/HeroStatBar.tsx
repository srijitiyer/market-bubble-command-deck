"use client";

import { useShallow } from "zustand/react/shallow";
import {
  useDeck,
  getRatePerMin,
  activeChatters,
  platformShare,
} from "@/lib/store";
import { PLATFORM_LIST, PLATFORMS } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";

// Bold live stat bar — the broadcast's vital signs as the visual anchor (the
// competitor makes big static numbers a centerpiece; ours move in real time).
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-serif text-[28px] font-semibold leading-none tracking-tight text-fg tabular-nums">
        <AnimatedNumber value={value} format={formatNumber} />
      </span>
      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-faint">
        {label}
      </span>
    </div>
  );
}

export function HeroStatBar() {
  const demoMode = useDeck((s) => s.demoMode);
  const totalViewers = useDeck((s) =>
    s.channels.reduce((sum, c) => sum + (c.viewers ?? 0), 0),
  );
  const totalMessages = useDeck((s) => s.totalMessages);
  const rate = useDeck(getRatePerMin);
  const chatters = useDeck(activeChatters);
  const share = useDeck(useShallow(platformShare));
  const shareTotal = Math.max(1, share.twitch + share.kick + share.x);

  // Viewers: real when channels are live; in demo, a lively derived figure so
  // the broadcast reads as a packed room rather than "0 watching".
  const viewers =
    totalViewers > 0
      ? totalViewers
      : demoMode
        ? Math.round(11800 + chatters * 430 + rate * 95)
        : 0;

  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex items-end gap-7">
        <Stat label="Viewers" value={viewers} />
        <Stat label="Active chatters" value={chatters} />
        <Stat label="Messages" value={totalMessages} />
        <Stat label="Msgs / min" value={rate} />
      </div>

      {/* per-platform share of the merged feed */}
      <div className="hidden flex-col items-end gap-1.5 sm:flex">
        <div className="flex h-1.5 w-40 gap-px overflow-hidden rounded-full">
          {PLATFORM_LIST.map((p) => {
            const pct = (share[p] / shareTotal) * 100;
            return pct > 0 ? (
              <div
                key={p}
                style={{ width: `${pct}%`, background: PLATFORMS[p].muted }}
                className="h-full transition-all duration-500"
              />
            ) : null;
          })}
        </div>
        <div className="flex items-center gap-3">
          {PLATFORM_LIST.map((p) => (
            <span key={p} className="flex items-center gap-1">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: PLATFORMS[p].muted }}
              />
              <span className="mono text-[10px] text-faint">
                {Math.round((share[p] / shareTotal) * 100)}%
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
