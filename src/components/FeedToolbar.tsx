"use client";

import { Search, Trash2, X } from "lucide-react";
import { useDeck, filterMessages } from "@/lib/store";
import { PLATFORMS, PLATFORM_LIST, type Platform } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "./icons";
import type { Filters } from "@/lib/store";

const MODES: { id: Filters["mode"]; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mentions", label: "Mentions" },
  { id: "tickers", label: "Tickers" },
  { id: "mods", label: "Mods" },
];

export function FeedToolbar() {
  const filters = useDeck((s) => s.filters);
  const togglePlatformFilter = useDeck((s) => s.togglePlatformFilter);
  const setMode = useDeck((s) => s.setMode);
  const setSearch = useDeck((s) => s.setSearch);
  const clearMessages = useDeck((s) => s.clearMessages);
  const shown = useDeck((s) => filterMessages(s).length);

  return (
    <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
      {/* search + per-platform solo/mute toggles */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            id="feed-search"
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter messages or users…"
            className="w-full rounded-md bg-bg-soft py-1.5 pl-8 pr-7 text-[13px] text-fg placeholder:text-faint outline-none ring-1 ring-border transition-colors duration-150 focus:ring-brand/50"
          />
          {filters.search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-faint transition-colors hover:text-dim"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {PLATFORM_LIST.map((p: Platform) => {
            const on = filters.platforms[p];
            const meta = PLATFORMS[p];
            return (
              <button
                key={p}
                onClick={() => togglePlatformFilter(p)}
                className="flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150"
                style={
                  on
                    ? { background: meta.tint }
                    : { background: "transparent" }
                }
                title={`${on ? "Mute" : "Show"} ${meta.name}`}
                aria-pressed={on}
              >
                <PlatformIcon
                  platform={p}
                  className="h-3.5 w-3.5 transition-opacity"
                  style={{
                    color: on ? meta.accent : "var(--color-fg-faint)",
                    opacity: on ? 1 : 0.6,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* mode segmented control + count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5 rounded-md bg-bg-soft p-0.5 ring-1 ring-border">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-colors duration-150",
                filters.mode === m.id
                  ? "bg-white/[0.08] text-fg"
                  : "text-faint hover:text-dim",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] text-faint">{shown}</span>
          <button
            onClick={clearMessages}
            className="rounded-md p-1 text-faint transition-colors duration-150 hover:bg-white/5 hover:text-dim"
            title="Clear feed"
            aria-label="Clear feed"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
