"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Search,
  Sparkles,
  Trash2,
  Tv,
  Volume2,
  AtSign,
  DollarSign,
  Shield,
  Filter,
} from "lucide-react";
import { useDeck, channelKey } from "@/lib/store";
import { PLATFORMS, PLATFORM_LIST } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "./icons";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Targeted subscriptions so the palette doesn't re-render on every message.
  const demoMode = useDeck((s) => s.demoMode);
  const soundOn = useDeck((s) => s.soundOn);
  const platforms = useDeck(useShallow((s) => s.filters.platforms));
  const channels = useDeck(useShallow((s) => s.channels));
  const act = () => useDeck.getState();

  const commands = useMemo<Cmd[]>(() => {
    const list: Cmd[] = [
      {
        id: "demo",
        label: `Demo mode ${demoMode ? "off" : "on"}`,
        hint: "D",
        icon: <Sparkles className="h-4 w-4" />,
        run: () => act().toggleDemo(),
      },
      {
        id: "sound",
        label: `${soundOn ? "Mute" : "Unmute"} alerts`,
        icon: <Volume2 className="h-4 w-4" />,
        run: () => act().toggleSound(),
      },
      {
        id: "search",
        label: "Search the feed",
        hint: "/",
        icon: <Search className="h-4 w-4" />,
        run: () =>
          requestAnimationFrame(() =>
            document.getElementById("feed-search")?.focus(),
          ),
      },
      {
        id: "clear",
        label: "Clear feed",
        icon: <Trash2 className="h-4 w-4" />,
        run: () => act().clearMessages(),
      },
      {
        id: "mode-all",
        label: "Filter: all messages",
        icon: <Filter className="h-4 w-4" />,
        run: () => act().setMode("all"),
      },
      {
        id: "mode-mentions",
        label: "Filter: @ mentions",
        icon: <AtSign className="h-4 w-4" />,
        run: () => act().setMode("mentions"),
      },
      {
        id: "mode-tickers",
        label: "Filter: $ cashtags",
        icon: <DollarSign className="h-4 w-4" />,
        run: () => act().setMode("tickers"),
      },
      {
        id: "mode-hosts",
        label: "Filter: hosts only",
        icon: <Shield className="h-4 w-4" />,
        run: () => act().setMode("hosts"),
      },
      {
        id: "mode-mods",
        label: "Filter: mods only",
        icon: <Shield className="h-4 w-4" />,
        run: () => act().setMode("mods"),
      },
    ];
    for (const p of PLATFORM_LIST) {
      list.push({
        id: `toggle-${p}`,
        label: `${platforms[p] ? "Hide" : "Show"} ${PLATFORMS[p].name}`,
        icon: <PlatformIcon platform={p} className="h-4 w-4" />,
        run: () => act().togglePlatformFilter(p),
      });
    }
    for (const c of channels) {
      list.push({
        id: `watch-${channelKey(c.platform, c.channel)}`,
        label: `Watch ${c.channel}`,
        hint: PLATFORMS[c.platform].name,
        icon: <Tv className="h-4 w-4" />,
        run: () => act().setActiveStream(channelKey(c.platform, c.channel)),
      });
    }
    return list;
  }, [demoMode, soundOn, platforms, channels]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[active];
        if (cmd) {
          cmd.run();
          close();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, close]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[14vh]"
      onClick={close}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        className="raised relative w-full max-w-lg overflow-hidden rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
          <Search className="h-4 w-4 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Type a command…"
            className="flex-1 bg-transparent text-sm text-fg placeholder:text-faint outline-none"
          />
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-faint">
            ESC
          </span>
        </div>
        <div className="max-h-[44vh] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-faint">
              No commands match.
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  cmd.run();
                  close();
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  i === active ? "bg-white/[0.07] text-fg" : "text-dim",
                )}
              >
                <span className="text-faint">{cmd.icon}</span>
                <span className="flex-1">{cmd.label}</span>
                {cmd.hint && (
                  <span className="mono rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-faint">
                    {cmd.hint}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
