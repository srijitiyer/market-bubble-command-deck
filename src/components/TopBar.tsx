"use client";

import { LayoutGrid, MonitorPlay, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useDeck, getRatePerMin } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { BubbleMark } from "./icons";
import { AnimatedNumber } from "./AnimatedNumber";

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="eyebrow">{label}</span>
      <span className="mono text-[13px] font-semibold leading-none text-fg">
        <AnimatedNumber value={value} format={formatNumber} />
      </span>
    </div>
  );
}

export function TopBar() {
  const demoMode = useDeck((s) => s.demoMode);
  const toggleDemo = useDeck((s) => s.toggleDemo);
  const soundOn = useDeck((s) => s.soundOn);
  const toggleSound = useDeck((s) => s.toggleSound);
  const connections = useDeck((s) => s.connections);
  const viewMode = useDeck((s) => s.viewMode);
  const setViewMode = useDeck((s) => s.setViewMode);
  const rate = useDeck(getRatePerMin);
  const totalViewers = useDeck((s) =>
    s.channels.reduce((sum, c) => sum + (c.viewers ?? 0), 0),
  );

  const liveCount = Object.values(connections).filter(
    (c) => c.state === "connected",
  ).length;

  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center gap-4 border-b border-border px-4">
      <div className="flex items-center gap-3">
        <BubbleMark className="h-8 w-8 drop-shadow-[0_2px_10px_rgba(233,225,209,0.5)]" />
        <div className="leading-none">
          <div className="flex items-center gap-2">
            <span className="font-serif text-[20px] font-semibold leading-none tracking-tight text-fg">
              Market Bubble
            </span>
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-dim">
              Command Deck
            </span>
          </div>
          <span className="mt-1.5 block font-serif text-[11px] italic text-faint">
            Presented by Polymarket
          </span>
        </div>
      </div>

      {/* live broadcast status cluster */}
      <div className="ml-3 hidden items-center gap-4 border-l border-border pl-4 md:flex">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute h-2 w-2 rounded-full bg-pos opacity-60 live-dot" />
            <span className="relative h-2 w-2 rounded-full bg-pos" />
          </span>
          <span className="eyebrow" style={{ color: "var(--color-pos)" }}>
            Live
          </span>
        </div>
        <StatChip label="Feeds" value={liveCount} />
        <StatChip label="Msgs / min" value={rate} />
        {totalViewers > 0 && <StatChip label="Viewers" value={totalViewers} />}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Stage / Deck view switch */}
        <div className="flex items-center gap-0.5 rounded-md bg-bg-soft p-0.5 ring-1 ring-border">
          <button
            onClick={() => setViewMode("stage")}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-[11px] font-medium transition-colors duration-150",
              viewMode === "stage"
                ? "bg-white/[0.08] text-fg"
                : "text-faint hover:text-dim",
            )}
            title="Broadcast stage"
          >
            <MonitorPlay className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Stage</span>
          </button>
          <button
            onClick={() => setViewMode("deck")}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-[11px] font-medium transition-colors duration-150",
              viewMode === "deck"
                ? "bg-white/[0.08] text-fg"
                : "text-faint hover:text-dim",
            )}
            title="Power-user deck"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Deck</span>
          </button>
        </div>
        <button
          onClick={() =>
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true }),
            )
          }
          className="hidden h-8 items-center gap-1.5 rounded-md px-2.5 text-[11px] text-faint ring-1 ring-border transition-colors duration-150 hover:text-dim hover:ring-border-strong sm:flex"
          title="Command palette"
        >
          <span>Commands</span>
          <span className="mono rounded bg-white/5 px-1 text-[10px]">⌘K</span>
        </button>
        <button
          onClick={toggleSound}
          className="flex h-8 w-8 items-center justify-center rounded-md text-faint ring-1 ring-border transition-colors duration-150 hover:text-dim hover:ring-border-strong"
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
            "flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors duration-150",
            demoMode
              ? "bg-brand text-[#181410] shadow-lg shadow-brand/20"
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
