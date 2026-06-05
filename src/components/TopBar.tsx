"use client";

import { Sparkles, Volume2, VolumeX } from "lucide-react";
import { useDeck, getRatePerMin } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { BubbleMark } from "./icons";

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="eyebrow">{label}</span>
      <span className="mono text-[13px] font-semibold leading-none text-fg">
        {value}
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
  const rate = useDeck(getRatePerMin);
  const totalViewers = useDeck((s) =>
    s.channels.reduce((sum, c) => sum + (c.viewers ?? 0), 0),
  );

  const liveCount = Object.values(connections).filter(
    (c) => c.state === "connected",
  ).length;

  return (
    <header className="relative z-10 flex items-center gap-4 border-b border-border px-4 py-2">
      <div className="flex items-center gap-2.5">
        <BubbleMark className="h-8 w-8 drop-shadow-[0_2px_10px_rgba(184,139,255,0.55)]" />
        <div className="leading-none">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold tracking-tight">
              Market Bubble
            </span>
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-dim">
              Command Deck
            </span>
          </div>
          <span className="text-[11px] text-faint">Every stream · One chat</span>
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
        <StatChip label="Feeds" value={String(liveCount)} />
        <StatChip label="Msgs / min" value={formatNumber(rate)} />
        {totalViewers > 0 && (
          <StatChip label="Viewers" value={formatNumber(totalViewers)} />
        )}
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
              ? "bg-brand text-[#1a0e2e] shadow-lg shadow-brand/20"
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
