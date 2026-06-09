"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";
import { useDeck, getRatePerMin } from "@/lib/store";
import { analyzeSentiment } from "@/lib/sentiment";

const TONE_COLOR = {
  bull: "var(--color-pos)",
  bear: "var(--color-neg)",
  neutral: "var(--color-fg-dim)",
} as const;

export function SentimentMeter() {
  const messages = useDeck((s) => s.messages);
  const rate = useDeck(getRatePerMin);
  const sentiment = useMemo(() => analyzeSentiment(messages), [messages]);

  // Map -1..1 to 0..100 needle position.
  const pos = ((sentiment.score + 1) / 2) * 100;
  const color = TONE_COLOR[sentiment.tone];

  // Hype = message velocity, 0..1 (saturates ~200/min).
  const hype = Math.min(1, rate / 200);
  const hypeLabel =
    hype > 0.75 ? "Peak" : hype > 0.45 ? "Heating" : hype > 0.15 ? "Active" : "Calm";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Chat sentiment</span>
        <span className="text-[11px] font-semibold" style={{ color }}>
          {sentiment.label}
        </span>
      </div>

      {/* sentiment bar with needle */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gradient-to-r from-neg/40 via-white/10 to-pos/40">
        <div
          className="absolute top-1/2 h-3.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-700"
          style={{ left: `${pos}%`, background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-faint">FUD</span>
        <span className="mono text-[10px] text-faint">
          {sentiment.bull}▲ · {sentiment.bear}▼
        </span>
        <span className="text-[10px] text-faint">Bullish</span>
      </div>

      {/* hype meter */}
      <div className="flex items-center gap-2 pt-0.5">
        <Flame
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: hype > 0.45 ? "var(--color-warn)" : "var(--color-fg-faint)" }}
        />
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(4, hype * 100)}%`,
              background:
                hype > 0.45
                  ? "linear-gradient(90deg,var(--color-warn),var(--color-neg))"
                  : "rgba(255,255,255,0.25)",
            }}
          />
        </div>
        <span className="eyebrow shrink-0" style={{ letterSpacing: "0.08em" }}>
          {hypeLabel}
        </span>
      </div>
    </div>
  );
}
