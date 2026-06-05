"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  RAIL_SYMBOLS,
  getPricesBySymbol,
  formatPrice,
  type TokenPrice,
} from "@/lib/prices";
import { cn } from "@/lib/utils";

interface Row extends TokenPrice {
  symbol: string;
  flash?: "up" | "down";
}

export function TickerRail() {
  const [rows, setRows] = useState<Row[]>([]);
  const prev = useRef<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const prices = await getPricesBySymbol(RAIL_SYMBOLS);
      if (!alive) return;
      const next: Row[] = RAIL_SYMBOLS.filter((s) => prices[s]).map((s) => {
        const p = prices[s];
        const before = prev.current[s];
        const flash =
          before !== undefined && p.usd !== before
            ? p.usd > before
              ? "up"
              : "down"
            : undefined;
        prev.current[s] = p.usd;
        return { symbol: s, ...p, flash };
      });
      setRows(next);
    };
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!rows.length) {
    return (
      <div className="flex h-8 items-center gap-2 px-4">
        <span className="eyebrow">Markets</span>
        <span className="text-[11px] text-faint">loading live prices…</span>
      </div>
    );
  }

  return (
    <div className="flex h-8 items-center gap-1 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="eyebrow mr-1 shrink-0 px-1">Markets</span>
      {rows.map((r) => {
        const up = r.change24h >= 0;
        return (
          <div
            key={r.symbol}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1",
              r.flash === "up" && "tick-up",
              r.flash === "down" && "tick-down",
            )}
          >
            <span className="text-[11px] font-semibold text-fg">{r.symbol}</span>
            <span className="mono text-[11px] text-dim">
              ${formatPrice(r.usd)}
            </span>
            <span
              className="mono flex items-center gap-0.5 text-[10px] font-medium"
              style={{ color: up ? "var(--color-pos)" : "var(--color-neg)" }}
            >
              {up ? (
                <TrendingUp className="h-2.5 w-2.5" />
              ) : (
                <TrendingDown className="h-2.5 w-2.5" />
              )}
              {up ? "+" : ""}
              {r.change24h.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
