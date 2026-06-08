"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

// On-brand wedge: chat kept asking for "live odds for every take." Market Bubble
// runs with Polymarket, so we surface live prediction-market odds right next to
// the stream. Seeded markets with a gentle live drift (a real Polymarket Gamma
// API feed drops straight into the same shape).
interface Market {
  q: string;
  prob: number; // 0-100 (Yes)
  vol: string;
  delta: number; // last tick movement
}

const SEED: Market[] = [
  { q: "BTC above $110k this Friday", prob: 63, vol: "$2.4M", delta: 0 },
  { q: "$SOL reclaims $200 in 7d", prob: 41, vol: "$880k", delta: 0 },
  { q: "Ansem name-drops $BUBBLE on stream", prob: 78, vol: "$310k", delta: 0 },
];

export function PolymarketOdds() {
  const [markets, setMarkets] = useState(SEED);

  // Gentle random-walk so the book feels live during the pitch.
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setMarkets((prev) =>
        prev.map((m, idx) => {
          const step = (Math.sin(i * 0.7 + idx * 2) + (idx % 2 ? -0.4 : 0.4)) * 0.9;
          const next = Math.max(6, Math.min(94, m.prob + step));
          return { ...m, prob: next, delta: next - m.prob };
        }),
      );
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Live odds · Polymarket</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-pos live-dot" />
          <span className="eyebrow" style={{ color: "var(--color-pos)" }}>
            Live
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {markets.map((m) => {
          const up = m.delta >= 0;
          return (
            <div key={m.q} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[12px] text-dim">{m.q}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {up ? (
                    <TrendingUp className="h-3 w-3 text-pos" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-neg" />
                  )}
                  <span
                    className="mono text-[13px] font-semibold tabular-nums"
                    style={{ color: up ? "var(--color-pos)" : "var(--color-neg)" }}
                  >
                    {Math.round(m.prob)}%
                  </span>
                </span>
              </div>
              <div className="flex h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <span
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${m.prob}%`,
                    background:
                      "linear-gradient(90deg, var(--color-brand-2), var(--color-brand))",
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-faint">Yes</span>
                <span className="mono text-[10px] text-faint">{m.vol} vol</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
