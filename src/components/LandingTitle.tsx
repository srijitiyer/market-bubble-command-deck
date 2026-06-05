"use client";

import { useEffect, useState } from "react";
import { BubbleMark, PlatformIcon } from "./icons";
import { PLATFORMS, type Platform } from "@/lib/types";

// Cinematic cold-open: three platform glyphs fly in and converge, the orb bursts
// out of the merge point, then the wordmark + tagline resolve — and it all fades
// to reveal the live deck underneath.
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const GLYPHS: { p: Platform; from: string }[] = [
  { p: "twitch", from: "translate(-170px, 26px)" },
  { p: "x", from: "translate(0, -128px)" },
  { p: "kick", from: "translate(170px, 26px)" },
];

export function LandingTitle() {
  // phases: 0 enter · 1 converge · 2 burst · 3 text · 4 out
  const [phase, setPhase] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 120),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1320),
      setTimeout(() => setPhase(4), 2700),
      setTimeout(() => setGone(true), 3300),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (gone) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      style={{
        opacity: phase >= 4 ? 0 : 1,
        transition: "opacity 0.55s ease",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 65% at 50% 46%, rgba(6,7,11,0.97), rgba(6,7,11,0.99) 70%)",
          backdropFilter: "blur(3px)",
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* convergence stage */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          {/* burst glow */}
          <span
            className="absolute rounded-full"
            style={{
              width: 150,
              height: 150,
              background:
                "radial-gradient(circle, rgba(184,139,255,0.45), transparent 65%)",
              opacity: phase === 2 ? 1 : 0,
              transform: phase >= 2 ? "scale(1.1)" : "scale(0.4)",
              transition: `opacity .6s ease, transform .7s ${EASE}`,
            }}
          />
          {/* platform glyphs converging */}
          {GLYPHS.map(({ p, from }) => {
            const meta = PLATFORMS[p];
            const converged = phase >= 1;
            const burst = phase >= 2;
            return (
              <span
                key={p}
                className="absolute flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background: meta.tint,
                  boxShadow: `inset 0 0 0 1px ${meta.accent}55`,
                  transform: burst
                    ? "translate(0,0) scale(0.3)"
                    : converged
                      ? "translate(0,0) scale(1)"
                      : from,
                  opacity: burst ? 0 : converged ? 1 : 0,
                  transition: `transform .8s ${EASE}, opacity .5s ease`,
                }}
              >
                <PlatformIcon
                  platform={p}
                  className="h-5 w-5"
                  style={{ color: meta.accent }}
                />
              </span>
            );
          })}
          {/* the orb bursting from the merge point */}
          <BubbleMark
            className="relative h-20 w-20 drop-shadow-[0_4px_24px_rgba(184,139,255,0.6)]"
            style={{
              transform: phase >= 2 ? "scale(1)" : "scale(0)",
              opacity: phase >= 2 ? 1 : 0,
              transition: `transform .7s ${EASE}, opacity .4s ease`,
            }}
          />
        </div>

        {/* wordmark + tagline */}
        <div
          className="mt-6 text-center"
          style={{
            opacity: phase >= 3 && phase < 4 ? 1 : 0,
            transform: phase >= 3 ? "translateY(0)" : "translateY(10px)",
            transition: `opacity .5s ease, transform .6s ${EASE}`,
          }}
        >
          <div className="text-[34px] font-semibold leading-none tracking-tight text-fg">
            Market Bubble
          </div>
          <div className="mt-3 bg-gradient-to-r from-[#b88bff] via-[#cdbcff] to-[#8aa0ff] bg-clip-text text-[13px] font-medium uppercase tracking-[0.34em] text-transparent">
            Every stream · One chat
          </div>
        </div>
      </div>
    </div>
  );
}
