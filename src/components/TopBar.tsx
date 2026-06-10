"use client";

import { LayoutGrid, MonitorPlay, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useDeck } from "@/lib/store";
import { cn } from "@/lib/utils";
import { BubbleMark } from "./icons";

type Section = "live" | "markets" | "leaders";
const NAV: { id: Section; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "markets", label: "Markets" },
  { id: "leaders", label: "Leaderboard" },
];

export function TopBar() {
  const demoMode = useDeck((s) => s.demoMode);
  const toggleDemo = useDeck((s) => s.toggleDemo);
  const soundOn = useDeck((s) => s.soundOn);
  const toggleSound = useDeck((s) => s.toggleSound);
  const viewMode = useDeck((s) => s.viewMode);
  const setViewMode = useDeck((s) => s.setViewMode);
  const section = useDeck((s) => s.section);
  const setSection = useDeck((s) => s.setSection);

  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center gap-4 border-b border-border px-4">
      {/* brand */}
      <div className="flex items-center gap-3">
        <BubbleMark className="h-8 w-8 drop-shadow-[0_2px_10px_rgba(233,225,209,0.45)]" />
        <div className="leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-serif text-[19px] font-semibold leading-none tracking-tight text-fg">
              Market Bubble
            </span>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute h-1.5 w-1.5 rounded-full bg-pos opacity-60 live-dot" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
            </span>
          </div>
          <span className="mt-1 block font-serif text-[10px] italic text-faint">
            Presented by Polymarket
          </span>
        </div>
      </div>

      {/* center nav */}
      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-lg bg-bg-soft p-0.5 ring-1 ring-border md:flex">
        {NAV.map((n) => (
          <button
            key={n.id}
            data-tour={`nav-${n.id}`}
            onClick={() => setSection(n.id)}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-[12px] font-medium transition-colors duration-150",
              section === n.id
                ? "bg-white/[0.08] text-fg"
                : "text-faint hover:text-dim",
            )}
            aria-pressed={section === n.id}
          >
            {n.label}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {/* Stage / Deck view switch (only relevant in the Live section) */}
        {section === "live" && (
          <div className="hidden items-center gap-0.5 rounded-md bg-bg-soft p-0.5 ring-1 ring-border sm:flex">
            <button
              data-tour="toggle-stage"
              onClick={() => setViewMode("stage")}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-[11px] font-medium transition-colors duration-150",
                viewMode === "stage" ? "bg-white/[0.08] text-fg" : "text-faint hover:text-dim",
              )}
              title="Broadcast stage"
            >
              <MonitorPlay className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Stage</span>
            </button>
            <button
              data-tour="toggle-deck"
              onClick={() => setViewMode("deck")}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-[11px] font-medium transition-colors duration-150",
                viewMode === "deck" ? "bg-white/[0.08] text-fg" : "text-faint hover:text-dim",
              )}
              title="Power-user deck"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Deck</span>
            </button>
          </div>
        )}
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
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
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
