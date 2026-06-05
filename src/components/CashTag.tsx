"use client";

import { useState } from "react";
import {
  getMarketForSymbol,
  formatPrice,
  formatMcap,
  coingeckoUrl,
  SYMBOL_TO_ID,
  type MarketRow,
} from "@/lib/prices";
import { Sparkline } from "./Sparkline";

// A $CASHTAG in chat that reveals a live price card on hover. Crypto-native
// touch lifted from X's Smart Cashtags, applied to the merged feed.
export function CashTag({ symbol }: { symbol: string }) {
  const sym = symbol.toUpperCase();
  const known = Boolean(SYMBOL_TO_ID[sym]);
  const [open, setOpen] = useState(false);
  const [market, setMarket] = useState<MarketRow | null>(null);
  const [loading, setLoading] = useState(false);

  const onEnter = () => {
    setOpen(true);
    if (known && !market && !loading) {
      setLoading(true);
      void getMarketForSymbol(sym)
        .then(setMarket)
        .finally(() => setLoading(false));
    }
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={onEnter}
      onMouseLeave={() => setOpen(false)}
    >
      {known ? (
        <a
          href={coingeckoUrl(SYMBOL_TO_ID[sym])}
          target="_blank"
          rel="noreferrer"
          className="mono rounded bg-brand/[0.1] px-1 text-[0.92em] font-medium text-brand transition-colors hover:bg-brand/[0.18]"
        >
          ${sym}
        </a>
      ) : (
        <span className="mono cursor-default rounded bg-white/[0.05] px-1 text-[0.92em] font-medium text-dim">
          ${sym}
        </span>
      )}
      {open && (
        <span className="absolute bottom-full left-1/2 z-30 mb-1.5 block w-44 -translate-x-1/2 rounded-lg border border-border-strong bg-overlay p-2.5 text-left shadow-2xl">
          <span className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fg">${sym}</span>
            {known ? (
              <span className="eyebrow" style={{ color: "var(--color-pos)" }}>
                Live
              </span>
            ) : (
              <span className="eyebrow">Stream token</span>
            )}
          </span>
          {!known ? (
            <span className="mt-1 block text-[10px] leading-snug text-faint">
              No public market yet — tracked as a stream cashtag.
            </span>
          ) : loading && !market ? (
            <span className="mt-1.5 block text-[11px] text-faint">
              loading price…
            </span>
          ) : market ? (
            <span className="mt-1.5 block">
              <span className="flex items-end justify-between gap-2">
                <span className="mono text-sm font-semibold text-fg">
                  ${formatPrice(market.usd)}
                </span>
                <Sparkline
                  data={market.spark}
                  width={64}
                  height={20}
                  color={
                    market.change24h >= 0
                      ? "var(--color-pos)"
                      : "var(--color-neg)"
                  }
                />
              </span>
              <span className="mt-1 flex items-center justify-between">
                <span
                  className="mono text-[11px] font-medium"
                  style={{
                    color:
                      market.change24h >= 0
                        ? "var(--color-pos)"
                        : "var(--color-neg)",
                  }}
                >
                  {market.change24h >= 0 ? "+" : ""}
                  {market.change24h.toFixed(2)}% · 24h
                </span>
                <span className="mono text-[10px] text-faint">
                  {formatMcap(market.marketCap)}
                </span>
              </span>
              <span className="mt-1.5 flex items-center gap-1 text-[10px] text-brand">
                view on CoinGecko →
              </span>
            </span>
          ) : (
            <span className="mt-1.5 block text-[11px] text-faint">
              price unavailable
            </span>
          )}
        </span>
      )}
    </span>
  );
}
