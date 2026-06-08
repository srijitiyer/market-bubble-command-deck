"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useShallow } from "zustand/react/shallow";
import { ArrowDown, Pause } from "lucide-react";
import { useDeck, filterMessages } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";
import { MessageRow } from "./MessageRow";

// Collapse consecutive messages from the same author+platform within 60s into a
// single visual group (IRC/Discord-compact): only the head row shows glyph+name.
function isContinuation(prev: ChatMessage | undefined, cur: ChatMessage) {
  if (!prev || prev.isHost || cur.isHost) return false;
  return (
    prev.platform === cur.platform &&
    prev.username === cur.username &&
    prev.channel === cur.channel &&
    cur.timestamp - prev.timestamp < 60_000
  );
}

export function UnifiedFeed() {
  const messages = useDeck(useShallow(filterMessages));
  const paused = useDeck((s) => s.paused);
  const setPaused = useDeck((s) => s.setPaused);
  const totalMessages = useDeck((s) => s.totalMessages);

  const parentRef = useRef<HTMLDivElement>(null);
  const pausedAtTotal = useRef<number>(0);
  const [newCount, setNewCount] = useState(0);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 26,
    overscan: 18,
    getItemKey: (i) => messages[i]?.id ?? i,
  });

  const scrollToBottom = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  // Stick to bottom whenever new messages arrive and we're live.
  useLayoutEffect(() => {
    if (!paused) scrollToBottom();
  }, [messages, paused, scrollToBottom]);

  // Track how many messages accumulated while paused.
  useEffect(() => {
    if (paused) setNewCount(Math.max(0, totalMessages - pausedAtTotal.current));
  }, [paused, totalMessages]);

  const onScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > 90) {
      if (!paused) {
        pausedAtTotal.current = totalMessages;
        setPaused(true);
      }
    } else if (distanceFromBottom < 24 && paused) {
      setPaused(false);
      setNewCount(0);
    }
  }, [paused, setPaused, totalMessages]);

  const resume = useCallback(() => {
    setPaused(false);
    setNewCount(0);
    requestAnimationFrame(scrollToBottom);
  }, [setPaused, scrollToBottom]);

  const items = virtualizer.getVirtualItems();

  return (
    <div className="relative flex h-full flex-col">
      <div
        ref={parentRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Unified live chat feed"
        className="relative flex-1 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            style={{ height: virtualizer.getTotalSize(), position: "relative" }}
          >
            {items.map((vi) => (
              <div
                key={vi.key}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                <MessageRow
                  msg={messages[vi.index]}
                  fresh={vi.index >= messages.length - 4}
                  firstOfGroup={
                    !isContinuation(messages[vi.index - 1], messages[vi.index])
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paused / jump-to-live pill */}
      {paused && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <button
            onClick={resume}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-[#181410] shadow-lg shadow-brand/30 transition hover:brightness-110"
          >
            <Pause className="h-3 w-3" />
            Paused
            {newCount > 0 && (
              <span className="mono rounded-full bg-black/25 px-1.5 py-0.5 text-[10px]">
                {newCount} new
              </span>
            )}
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-sm font-medium text-dim">Waiting for chat…</div>
      <p className="max-w-xs text-xs text-faint">
        Add a Twitch, Kick or X channel from the left rail, or flip on Demo mode
        to see the unified feed light up.
      </p>
    </div>
  );
}
