"use client";

import { useEffect, useState } from "react";
import { BubbleMark } from "./icons";

// A title card that resolves over the already-live feed for ~2.4s, then fades.
// Not a loading screen — the deck is interactive underneath the whole time.
export function LandingTitle() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), 2500);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 45%, rgba(8,9,12,0.86), rgba(8,9,12,0.55) 60%, transparent)",
        }}
      />
      <div className="animate-title relative flex flex-col items-center gap-4">
        <BubbleMark className="h-16 w-16 drop-shadow-[0_4px_20px_rgba(184,139,255,0.6)]" />
        <div className="text-center">
          <div className="text-3xl font-semibold tracking-tight text-fg">
            Market Bubble
          </div>
          <div className="mt-1 bg-gradient-to-r from-[#b88bff] via-[#cdbcff] to-[#8aa0ff] bg-clip-text text-sm font-medium uppercase tracking-[0.3em] text-transparent">
            Every stream · One chat
          </div>
        </div>
      </div>
    </div>
  );
}
