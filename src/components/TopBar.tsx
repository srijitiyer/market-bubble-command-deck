"use client";

import { Radio, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useDeck, getRatePerMin } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { BubbleMark } from "./icons";

export function TopBar() {
  const demoMode = useDeck((s) => s.demoMode);
  const toggleDemo = useDeck((s) => s.toggleDemo);
  const soundOn = useDeck((s) => s.soundOn);
  const toggleSound = useDeck((s) => s.toggleSound);
  const connections = useDeck((s) => s.connections);
  const rate = useDeck(getRatePerMin);

  const liveCount = Object.values(connections).filter(
    (c) => c.state === "connected",
  ).length;

  return (
    <header className="relative z-10 flex items-center gap-3 border-b border-border px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <BubbleMark className="h-8 w-8 drop-shadow-[0_2px_8px_rgba(177,108,255,0.5)]" />
        <div className="leading-none">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold tracking-tight">
              Market Bubble
            </span>
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-dim">
              Command Deck
            </span>
          </div>
          <span className="text-[11px] text-faint">
            Unified live chat · Twitch · Kick · X
          </span>
        </div>
      </div>

      <div className="ml-4 hidden items-center gap-4 md:flex">
        <div className="flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-pos" />
          <span className="mono text-xs text-fg">{liveCount}</span>
          <span className="text-[11px] text-faint">live feeds</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="mono text-xs text-pos">{formatNumber(rate)}</span>
          <span className="text-[11px] text-faint">msgs/min</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggleSound}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-faint ring-1 ring-border transition hover:text-dim hover:ring-border-strong"
          title={soundOn ? "Mute alerts" : "Unmute alerts"}
        >
          {soundOn ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </button>

        <button
          onClick={toggleDemo}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
            demoMode
              ? "bg-brand text-white shadow-lg shadow-brand/25"
              : "text-dim ring-1 ring-border hover:text-fg hover:ring-border-strong",
          )}
          title="Toggle synthetic demo traffic across all sources"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Demo {demoMode ? "ON" : "OFF"}
        </button>
      </div>
    </header>
  );
}
