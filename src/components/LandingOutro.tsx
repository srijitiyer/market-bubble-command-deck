"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BubbleMark, PlatformIcon } from "./icons";
import { PLATFORMS, type Platform } from "@/lib/types";

// Cinematic sign-off — the bookend to the cold-open. A veil settles over the
// deck, the bubble floats up and blooms, the three platform glyphs fan out into
// a row beneath the wordmark, and a light sweep crosses the title. Holds, then
// lifts to hand the deck back. Replayable via window.__playOutro (the demo tour
// fires it as the closing shot of every recording).
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

const ROW: { p: Platform; x: number }[] = [
  { p: "twitch", x: -52 },
  { p: "x", x: 0 },
  { p: "kick", x: 52 },
];

export function LandingOutro() {
  // -1 hidden · 0 veil · 1 orb bloom · 2 wordmark + glyph row · 3 hold · 4 lift
  const [phase, setPhase] = useState(-1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const play = useCallback(() => {
    timers.current.forEach(clearTimeout);
    setPhase(0);
    timers.current = [
      setTimeout(() => setPhase(1), 60),
      setTimeout(() => setPhase(2), 760),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 4200),
      setTimeout(() => setPhase(-1), 4900),
    ];
  }, []);

  useEffect(() => {
    (window as unknown as { __playOutro?: () => void }).__playOutro = play;
    return () => timers.current.forEach(clearTimeout);
  }, [play]);

  if (phase < 0) return null;

  const shown = phase >= 1 && phase < 4;
  const textIn = phase >= 2 && phase < 4;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ opacity: phase >= 4 ? 0 : 1, transition: "opacity 0.6s ease" }}
    >
      {/* veil */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(62% 60% at 50% 46%, rgba(8,9,13,0.92), rgba(6,7,11,0.99) 72%)",
          backdropFilter: "blur(5px)",
          opacity: phase === 0 ? 0 : 1,
          transition: "opacity 0.55s ease",
        }}
      />

      {/* bloom */}
      <div
        className="absolute left-1/2 top-[44%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(176,139,242,0.26), rgba(138,160,255,0.10) 44%, transparent 68%)",
          opacity: shown ? 1 : 0,
          transform: `translate(-50%,-50%) scale(${shown ? 1.1 : 0.7})`,
          transition: `opacity .8s ease, transform 1s ${EASE_OUT}`,
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* bubble */}
        <BubbleMark
          className="relative h-[84px] w-[84px]"
          style={{
            filter: "drop-shadow(0 6px 30px rgba(176,139,242,0.6))",
            opacity: shown ? 1 : 0,
            transform: shown ? "translateY(0) scale(1)" : "translateY(16px) scale(0.6)",
            transition: `opacity .6s ease, transform .9s ${EASE_OUT}`,
            animation: phase >= 2 ? "float-bubble 4s ease-in-out infinite" : "none",
          }}
        />

        {/* wordmark with a light sweep */}
        <div
          className="relative mt-7 overflow-hidden text-center"
          style={{
            opacity: textIn ? 1 : 0,
            transform: textIn ? "translateY(0)" : "translateY(12px)",
            transition: `opacity .6s ease, transform .7s ${EASE_OUT}`,
          }}
        >
          <div className="relative inline-block">
            <div className="text-[38px] font-semibold leading-none tracking-tight text-fg">
              Market Bubble
            </div>
            {phase >= 2 && (
              <span
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.5) 50%, transparent 62%)",
                  backgroundSize: "220% 100%",
                  mixBlendMode: "overlay",
                  animation: "sweep 1.1s ease-out 0.35s 1",
                }}
              />
            )}
          </div>
          <div className="mt-3 text-[13px] font-medium uppercase tracking-[0.34em] text-[#c6bdf0]">
            Every stream · One chat
          </div>
        </div>

        {/* platform glyph row fanning out below */}
        <div className="relative mt-7 flex h-11 w-full items-center justify-center">
          {ROW.map(({ p, x }, i) => {
            const meta = PLATFORMS[p];
            return (
              <span
                key={p}
                className="absolute flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  background: meta.tint,
                  boxShadow: `inset 0 0 0 1px ${meta.muted}55, 0 6px 18px ${meta.glow}`,
                  transform: textIn
                    ? `translateX(${x}px) scale(1)`
                    : "translateX(0) scale(0.3)",
                  opacity: textIn ? 1 : 0,
                  transition: `transform .75s ${EASE_OUT} ${120 + i * 80}ms, opacity .5s ease ${120 + i * 80}ms`,
                }}
              >
                <PlatformIcon
                  platform={p}
                  className="h-[18px] w-[18px]"
                  style={{ color: meta.accent }}
                />
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
