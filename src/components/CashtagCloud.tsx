"use client";

import { useMemo } from "react";
import { useDeck, topCashtags } from "@/lib/store";
import { CashTag } from "./CashTag";

// What the room is trading — the most-mentioned $cashtags across the live feed.
export function CashtagCloud() {
  const messages = useDeck((s) => s.messages);
  const tags = useMemo(
    () => topCashtags({ messages } as Parameters<typeof topCashtags>[0], 10),
    [messages],
  );
  const max = Math.max(1, tags[0]?.count ?? 1);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Trending cashtags</span>
        <span className="eyebrow text-faint">live</span>
      </div>
      {tags.length === 0 ? (
        <span className="text-[11px] text-faint">No cashtags yet…</span>
      ) : (
        <div className="flex flex-col gap-1.5">
          {tags.map((t) => (
            <div key={t.symbol} className="flex items-center gap-2">
              <span className="w-14 shrink-0">
                <CashTag symbol={t.symbol} />
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <span
                  className="block h-full rounded-full bg-brand-2/70"
                  style={{ width: `${Math.max(8, (t.count / max) * 100)}%` }}
                />
              </span>
              <span className="mono w-5 shrink-0 text-right text-[11px] tabular-nums text-dim">
                {t.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
