"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getMarkets,
  formatPrice,
  formatMcap,
  coingeckoUrl,
  SYMBOL_TO_ID,
  type MarketRow,
} from "@/lib/prices";
import { Sparkline } from "./Sparkline";
import { PolymarketOdds } from "./PolymarketOdds";
import { SentimentMeter } from "./SentimentMeter";
import { PanelHeader } from "./PanelHeader";
import { CashtagCloud } from "./CashtagCloud";

// Markets section — a live "Global Markets" board off CoinGecko, the live
// Polymarket odds, chat sentiment, and what the room is trading. All real data,
// refreshed live (the competitor's market page is static).
const SYMBOLS = Object.keys(SYMBOL_TO_ID).filter((s) => s !== "USDC");

export function MarketsView() {
  const [rows, setRows] = useState<MarketRow[]>([]);

  useEffect(() => {
    let active = true;
    const load = () =>
      getMarkets(SYMBOLS).then((r) => {
        if (active) setRows(r);
      });
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.marketCap - a.marketCap),
    [rows],
  );

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-y-auto p-3">
      {/* Global markets table */}
      <section
        className="panel flex min-w-0 flex-1 flex-col overflow-hidden"
        data-tour="markets"
      >
        <PanelHeader
          title="Global Markets"
          aside={<span className="eyebrow text-faint">live · coingecko</span>}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-panel">
              <tr className="text-faint">
                <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-2 py-2 text-right text-[10px] font-medium uppercase tracking-wider">
                  Price
                </th>
                <th className="px-2 py-2 text-right text-[10px] font-medium uppercase tracking-wider">
                  24h
                </th>
                <th className="px-2 py-2 text-right text-[10px] font-medium uppercase tracking-wider">
                  7d
                </th>
                <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider">
                  Mkt Cap
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-faint">
                    Loading live prices…
                  </td>
                </tr>
              )}
              {sorted.map((r) => {
                const up = r.change24h >= 0;
                return (
                  <tr
                    key={r.id}
                    className="border-t border-border-subtle transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-2.5">
                      <a
                        href={coingeckoUrl(r.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-fg hover:underline"
                      >
                        {r.symbol}
                      </a>
                    </td>
                    <td className="mono px-2 py-2.5 text-right tabular-nums text-fg">
                      ${formatPrice(r.usd)}
                    </td>
                    <td
                      className="mono px-2 py-2.5 text-right tabular-nums"
                      style={{ color: up ? "var(--color-pos)" : "var(--color-neg)" }}
                    >
                      {up ? "+" : ""}
                      {r.change24h.toFixed(2)}%
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="flex justify-end">
                        <Sparkline
                          data={r.spark}
                          width={64}
                          height={20}
                          color={up ? "var(--color-pos)" : "var(--color-neg)"}
                        />
                      </span>
                    </td>
                    <td className="mono px-4 py-2.5 text-right tabular-nums text-dim">
                      {formatMcap(r.marketCap)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* right column — odds, sentiment, what the room is trading */}
      <aside className="flex w-[clamp(300px,26vw,380px)] shrink-0 flex-col gap-3 overflow-y-auto">
        <section className="panel flex flex-col p-4">
          <PolymarketOdds />
        </section>
        <section className="panel flex flex-col p-4">
          <SentimentMeter />
        </section>
        <section className="panel flex flex-col p-4">
          <CashtagCloud />
        </section>
      </aside>
    </div>
  );
}
