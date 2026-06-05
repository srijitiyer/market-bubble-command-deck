"use client";

import { useState } from "react";
import {
  getPriceForSymbol,
  formatPrice,
  formatMcap,
  SYMBOL_TO_ID,
  type TokenPrice,
} from "@/lib/prices";

// A $CASHTAG in chat that reveals a live price card on hover. Crypto-native
// touch lifted from X's Smart Cashtags, applied to the merged feed.
export function CashTag({ symbol }: { symbol: string }) {
  const sym = symbol.toUpperCase();
  const known = Boolean(SYMBOL_TO_ID[sym]);
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState<TokenPrice | null>(null);
  const [loading, setLoading] = useState(false);

  const onEnter = () => {
    setOpen(true);
    if (known && !price && !loading) {
      setLoading(true);
      void getPriceForSymbol(sym)
        .then(setPrice)
        .finally(() => setLoading(false));
    }
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={onEnter}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="mono cursor-default rounded bg-[rgba(46,189,133,0.12)] px-1 text-[0.92em] font-semibold text-[#2ebd85] transition hover:bg-[rgba(46,189,133,0.2)]">
        ${sym}
      </span>
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
          ) : loading && !price ? (
            <span className="mt-1.5 block text-[11px] text-faint">
              loading price…
            </span>
          ) : price ? (
            <span className="mt-1.5 block">
              <span className="mono block text-sm font-semibold text-fg">
                ${formatPrice(price.usd)}
              </span>
              <span className="mt-0.5 flex items-center justify-between">
                <span
                  className="mono text-[11px] font-medium"
                  style={{
                    color:
                      price.change24h >= 0
                        ? "var(--color-pos)"
                        : "var(--color-neg)",
                  }}
                >
                  {price.change24h >= 0 ? "+" : ""}
                  {price.change24h.toFixed(2)}% · 24h
                </span>
                <span className="mono text-[10px] text-faint">
                  {formatMcap(price.marketCap)}
                </span>
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
