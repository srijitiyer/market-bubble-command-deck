"use client";

import { useEffect, useState } from "react";
import {
  RAIL_SYMBOLS,
  getMarkets,
  formatPrice,
  coingeckoUrl,
  type MarketRow,
} from "@/lib/prices";
import { Sparkline } from "./Sparkline";

function TickerItem({ row }: { row: MarketRow }) {
  const up = row.change24h >= 0;
  const color = up ? "var(--color-pos)" : "var(--color-neg)";
  return (
    <a
      href={coingeckoUrl(row.id)}
      target="_blank"
      rel="noreferrer"
      className="group flex shrink-0 items-center gap-2 border-r border-border/60 px-4 py-1.5 transition-colors hover:bg-white/[0.03]"
      title={`${row.symbol} — view on CoinGecko`}
    >
      <span className="text-[11px] font-semibold tracking-wide text-fg">
        {row.symbol}
      </span>
      <span className="mono text-[11px] text-dim">${formatPrice(row.usd)}</span>
      <Sparkline data={row.spark} color={color} />
      <span className="mono text-[10px] font-medium" style={{ color }}>
        {up ? "+" : ""}
        {row.change24h.toFixed(1)}%
      </span>
    </a>
  );
}

export function TickerRail() {
  const [rows, setRows] = useState<MarketRow[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const r = await getMarkets(RAIL_SYMBOLS);
      if (alive && r.length) setRows(r);
    };
    void load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="flex h-9 items-stretch overflow-hidden">
      <div className="flex shrink-0 items-center gap-1.5 border-r border-border bg-bg-soft/60 px-3">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute h-1.5 w-1.5 rounded-full bg-pos opacity-60 live-dot" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-pos" />
        </span>
        <span className="eyebrow">Markets</span>
      </div>
      {rows.length === 0 ? (
        <div className="flex items-center px-4 text-[11px] text-faint">
          loading live prices…
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden">
          {/* duplicated track for a seamless infinite conveyor */}
          <div className="marquee-track">
            {[...rows, ...rows].map((row, i) => (
              <TickerItem key={`${row.id}-${i}`} row={row} />
            ))}
          </div>
          {/* edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-bg to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bg to-transparent" />
        </div>
      )}
    </div>
  );
}
