"use client";

import { Search, Trash2, X } from "lucide-react";
import { useDeck, filterMessages } from "@/lib/store";
import { PLATFORMS, PLATFORM_LIST, type Platform } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "./icons";
import type { Filters } from "@/lib/store";

const MODES: { id: Filters["mode"]; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mentions", label: "@ Mentions" },
  { id: "tickers", label: "$ Tickers" },
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
    <div className="flex flex-col gap-2.5 border-b border-border px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        {PLATFORM_LIST.map((p: Platform) => {
          const on = filters.platforms[p];
          const meta = PLATFORMS[p];
          return (
            <button
              key={p}
              onClick={() => togglePlatformFilter(p)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium transition",
                on ? "text-fg" : "text-faint hover:text-dim",
              )}
              style={
                on
                  ? {
                      background: meta.tint,
                      boxShadow: `inset 0 0 0 1px ${meta.accent}40`,
                    }
                  : { background: "rgba(255,255,255,0.02)" }
              }
              title={`${on ? "Hide" : "Show"} ${meta.name}`}
            >
              <PlatformIcon
                platform={p}
                className="h-3 w-3"
                style={{ color: on ? meta.accent : undefined }}
              />
              {meta.name}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <span className="mono text-[11px] text-faint">{shown} shown</span>
          <button
            onClick={clearMessages}
            className="rounded-md p-1 text-faint transition hover:bg-white/5 hover:text-dim"
            title="Clear feed"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter messages or users…"
            className="w-full rounded-lg bg-black/30 py-1.5 pl-8 pr-7 text-xs text-fg placeholder:text-faint outline-none ring-1 ring-border transition focus:ring-brand/50"
          />
          {filters.search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-dim"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-medium transition",
              filters.mode === m.id
                ? "bg-white/10 text-fg"
                : "text-faint hover:text-dim",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
