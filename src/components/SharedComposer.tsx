"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useDeck } from "@/lib/store";
import { PLATFORM_LIST, PLATFORMS } from "@/lib/types";
import { PlatformIcon } from "./icons";

// The "one shared chat" composer — the strategic core. A single box that posts
// to the unified room. Cross-posting to each platform's native chat needs
// per-platform OAuth (documented in the tooltip); here it broadcasts into the
// merged feed so the shared-room concept is tangible.
export function SharedComposer() {
  const broadcast = useDeck((s) => s.broadcast);
  const [text, setText] = useState("");

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    broadcast(text);
    setText("");
  };

  return (
    <form
      onSubmit={send}
      className="flex items-center gap-2 border-t border-border px-3 py-2"
    >
      <div className="flex items-center gap-0.5 pl-0.5">
        {PLATFORM_LIST.map((p) => (
          <PlatformIcon
            key={p}
            platform={p}
            className="h-3 w-3"
            style={{ color: PLATFORMS[p].accent }}
          />
        ))}
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Broadcast to the shared chat…"
        className="min-w-0 flex-1 bg-transparent text-[13px] text-fg placeholder:text-faint outline-none"
        aria-label="Broadcast to the shared chat"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="flex items-center gap-1.5 rounded-lg bg-brand px-2.5 py-1.5 text-[11px] font-semibold text-[#181410] transition enabled:hover:brightness-110 disabled:opacity-40"
        title="Posts to the unified shared room. Native cross-posting per platform needs OAuth."
      >
        <Send className="h-3 w-3" />
        Send to all
      </button>
    </form>
  );
}
