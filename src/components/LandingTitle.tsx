"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BubbleMark, PlatformIcon } from "./icons";
import { PLATFORMS, type Platform } from "@/lib/types";

// Cinematic cold-open: three platform glyphs fly into a tight row, then stream
// inward and collapse into the bubble as it blooms with a shockwave ring — the
// "every stream merges into one" idea, told in motion. The wordmark resolves,
// then the whole thing fades to reveal the live deck. Plays on load and is
// replayable via window.__playIntro (the demo tour replays it for recordings).
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_IN = "cubic-bezier(0.5, 0, 0.75, 0)";

// settled row position + offscreen entrance vector for each glyph
const GLYPHS: { p: Platform; row: string; from: string; delay: number }[] = [
  { p: "twitch", row: "translate(-64px, 0) scale(1)", from: "translate(-260px, 90px) scale(0.4)", delay: 0 },
  { p: "x", row: "translate(0, -4px) scale(1)", from: "translate(0, -210px) scale(0.4)", delay: 70 },
  { p: "kick", row: "translate(64px, 0) scale(1)", from: "translate(260px, 90px) scale(0.4)", delay: 140 },
];

export function LandingTitle() {
  // -1 hidden · 0 backdrop · 1 glyphs row · 2 merge+bloom · 3 wordmark · 4 out
  const [phase, setPhase] = useState(-1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const play = useCallback(() => {
    timers.current.forEach(clearTimeout);
    setPhase(0);
    timers.current = [
      setTimeout(() => setPhase(1), 90),
      setTimeout(() => setPhase(2), 1080),
      setTimeout(() => setPhase(3), 1680),
      setTimeout(() => setPhase(4), 3120),
      setTimeout(() => setPhase(-1), 3680),
    ];
  }, []);

  useEffect(() => {
    (window as unknown as { __playIntro?: () => void }).__playIntro = play;
    const kickoff = setTimeout(play, 0); // defer so first setState isn't sync-in-effect
    const startup = timers.current;
    return () => {
      clearTimeout(kickoff);
      startup.forEach(clearTimeout);
    };
  }, [play]);

  if (phase < 0) return null;

  const merged = phase >= 2;
  const bloom = phase >= 2 && phase < 4;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ opacity: phase >= 4 ? 0 : 1, transition: "opacity 0.5s ease" }}
    >
      {/* backdrop — fully opaque so the deck never bleeds through the cold-open */}
      <div className="absolute inset-0" style={{ background: "#070707" }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(64% 60% at 50% 47%, rgba(26,22,16,0.9), transparent 72%)",
        }}
      />

      {/* sweeping aurora wash that brightens at the merge */}
      <div
        className="absolute left-1/2 top-[46%] h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(233,225,209,0.22), rgba(201,168,106,0.10) 42%, transparent 68%)",
          opacity: phase === 0 ? 0 : bloom ? 1 : 0.5,
          transform: `translate(-50%,-50%) scale(${bloom ? 1.15 : 0.85})`,
          transition: `opacity .9s ease, transform 1.1s ${EASE_OUT}`,
        }}
      />

      <div className="relative flex flex-col items-center">
        <div className="relative flex h-28 w-28 items-center justify-center">
          {/* shockwave ring fired at the moment of merge */}
          {merged && <ShockRing />}

          {/* core bloom behind the bubble */}
          <span
            className="absolute rounded-full"
            style={{
              width: 168,
              height: 168,
              background:
                "radial-gradient(circle, rgba(233,225,209,0.55), transparent 62%)",
              opacity: bloom ? 1 : 0,
              transform: bloom ? "scale(1.1)" : "scale(0.3)",
              transition: `opacity .55s ease, transform .8s ${EASE_OUT}`,
            }}
          />

          {/* platform glyphs: fly into a row, then stream inward + vanish */}
          {GLYPHS.map(({ p, row, from, delay }) => {
            const meta = PLATFORMS[p];
            const transform = merged
              ? "translate(0,0) scale(0.12)"
              : phase >= 1
                ? row
                : from;
            return (
              <span
                key={p}
                className="absolute flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{
                  background: meta.tint,
                  boxShadow: `inset 0 0 0 1px ${meta.muted}55, 0 6px 20px ${meta.glow}`,
                  transform,
                  opacity: merged ? 0 : phase >= 1 ? 1 : 0,
                  transition: merged
                    ? `transform .5s ${EASE_IN}, opacity .45s ease`
                    : `transform .85s ${EASE_OUT} ${delay}ms, opacity .5s ease ${delay}ms`,
                }}
              >
                <PlatformIcon
                  platform={p}
                  className="h-[22px] w-[22px]"
                  style={{ color: meta.accent }}
                />
              </span>
            );
          })}

          {/* the bubble itself, born from the merge */}
          <BubbleMark
            className="relative h-[88px] w-[88px]"
            style={{
              filter: "drop-shadow(0 6px 28px rgba(233,225,209,0.6))",
              transform: merged
                ? phase >= 3
                  ? "scale(1)"
                  : "scale(1.08)"
                : "scale(0)",
              opacity: merged ? 1 : 0,
              transition: `transform .75s ${EASE_OUT}, opacity .4s ease`,
            }}
          />
        </div>

        {/* wordmark */}
        <div
          className="mt-7 text-center"
          style={{
            opacity: phase >= 3 && phase < 4 ? 1 : 0,
            transform: phase >= 3 ? "translateY(0)" : "translateY(12px)",
            transition: `opacity .55s ease, transform .7s ${EASE_OUT}`,
          }}
        >
          {/* show pillars — masthead kicker */}
          <div className="mb-4 flex items-center justify-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#cabba0]">
            <span>Make Money</span>
            <span className="text-faint">·</span>
            <span>Command Attention</span>
            <span className="text-faint">·</span>
            <span>Leverage AI</span>
          </div>
          <div
            className="font-serif text-[48px] font-semibold leading-none tracking-tight text-white"
            style={{ textShadow: "0 2px 28px rgba(233,225,209,0.4)" }}
          >
            Market Bubble
          </div>
          {/* hairline rule + presented-by lockup */}
          <div className="mt-5 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-[rgba(233,225,209,0.35)]" />
            <span className="font-serif text-[13px] italic text-[#cabba0]">
              Presented by Polymarket
            </span>
            <span className="h-px w-8 bg-[rgba(233,225,209,0.35)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Expanding ring shockwave fired once when the glyphs collapse into the bubble.
function ShockRing() {
  return (
    <span
      className="absolute rounded-full"
      style={{
        width: 60,
        height: 60,
        border: "1.5px solid rgba(233,225,209,0.85)",
        animation: "shock 0.9s cubic-bezier(0.16,1,0.3,1) forwards",
      }}
    />
  );
}
