"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

// On-brand wedge: chat kept asking for "live odds for every take." Market Bubble
// runs with Polymarket, so we surface live prediction-market odds (the crypto
// book) right next to the stream — pulled live from the Polymarket Gamma API via
// our /api/polymarket route, polled and diffed so movements read as real.
interface Market {
  question: string;
  prob: number; // Yes %
  volume: number;
  slug: string;
  delta: number; // change since last poll
}

const FALLBACK: Market[] = [
  { question: "Will Bitcoin dip to $50,000 in June?", prob: 12, volume: 120000, slug: "", delta: 0 },
  { question: "Will Bitcoin reach $65,000 in June?", prob: 71, volume: 95000, slug: "", delta: 0 },
  { question: "Bitcoin Up or Down today?", prob: 54, volume: 60000, slug: "", delta: 0 },
];

function fmtVol(v: number) {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${v}`;
}

export function PolymarketOdds() {
  const [markets, setMarkets] = useState<Market[]>(FALLBACK);
  const [live, setLive] = useState(false);
  const prev = useRef<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/polymarket");
        if (!res.ok) return;
        const json = (await res.json()) as {
          markets?: Omit<Market, "delta">[];
          live?: boolean;
        };
        if (!active || !Array.isArray(json.markets) || !json.markets.length) return;
        const next = json.markets.slice(0, 4).map((m) => ({
          ...m,
          delta: m.prob - (prev.current[m.question] ?? m.prob),
        }));
        for (const m of next) prev.current[m.question] = m.prob;
        setMarkets(next);
        setLive(Boolean(json.live));
      } catch {
        // keep whatever's on screen
      }
    };
    void load();
    const id = setInterval(load, 20_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Live odds · Polymarket</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-pos live-dot" />
          <span className="eyebrow" style={{ color: "var(--color-pos)" }}>
            {live ? "Live" : "Markets"}
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {markets.map((m) => {
          const up = m.delta >= 0;
          return (
            <a
              key={m.question}
              href={m.slug ? `https://polymarket.com/event/${m.slug}` : undefined}
              target={m.slug ? "_blank" : undefined}
              rel="noreferrer"
              className="flex flex-col gap-1 rounded-md transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[12px] text-dim">{m.question}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {m.delta !== 0 &&
                    (up ? (
                      <TrendingUp className="h-3 w-3 text-pos" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-neg" />
                    ))}
                  <span
                    className="mono text-[13px] font-semibold tabular-nums"
                    style={{
                      color:
                        m.delta === 0
                          ? "var(--color-fg)"
                          : up
                            ? "var(--color-pos)"
                            : "var(--color-neg)",
                    }}
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
                <span className="mono text-[10px] text-faint">
                  {fmtVol(m.volume)} · 24h
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
