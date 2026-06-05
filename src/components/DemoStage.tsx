"use client";

import { useEffect, useState } from "react";
import { PLATFORMS, type StreamChannel } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { PlatformIcon } from "./icons";

// A branded "live" stage shown in demo mode in place of a real embed, so the
// deck looks intentional and alive during a pitch instead of surfacing an
// offline third-party player.
export function DemoStage({ stream }: { stream: StreamChannel }) {
  const meta = PLATFORMS[stream.platform];
  const [viewers, setViewers] = useState(1280);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setViewers((v) => Math.max(800, v + Math.round((Math.random() - 0.45) * 60)));
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  // Static bubble field (deterministic so SSR/CSR match).
  const bubbles = Array.from({ length: 14 }, (_, i) => ({
    left: (i * 37) % 100,
    size: 6 + ((i * 13) % 26),
    delay: (i % 7) * 0.6,
    dur: 6 + (i % 5),
  }));

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 90% at 50% 0%, rgba(177,108,255,0.16), transparent 62%), linear-gradient(160deg,#0b0d14,#06070b)",
      }}
    >
      {/* fine dot-grid — reads as a screen */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          maskImage:
            "radial-gradient(120% 100% at 50% 40%, #000 30%, transparent 80%)",
        }}
      />

      {/* floating bubbles */}
      <div className="absolute inset-0">
        {bubbles.map((b, i) => (
          <span
            key={i}
            className="absolute bottom-0 rounded-full"
            style={{
              left: `${b.left}%`,
              width: b.size,
              height: b.size,
              background:
                "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.6), rgba(177,108,255,0.22) 60%, transparent)",
              animation: `float-bubble ${b.dur}s ease-in ${b.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* center brand with pulsing halo */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span
            className="absolute h-20 w-20 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(177,108,255,0.35), transparent 70%)",
              animation: "halo 3s ease-in-out infinite",
            }}
          />
          <span
            className="relative h-16 w-16 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 36% 30%, #f0d9ff, #c98bff 32%, #8a3df0 68%, #4a1d8f)",
              boxShadow: "0 0 40px rgba(177,108,255,0.45)",
            }}
          />
        </div>
        <div className="mt-1 text-[13px] font-semibold text-fg">
          {stream.channel}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-dim">
          <PlatformIcon
            platform={stream.platform}
            className="h-3.5 w-3.5"
            style={{ color: meta.accent }}
          />
          streaming on {meta.name}
          {/* live audio equalizer */}
          <span className="ml-1 flex items-end gap-[2px]">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-[2px] origin-bottom rounded-full"
                style={{
                  height: 9,
                  background: meta.accent,
                  animation: `eq 0.9s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </span>
        </div>
      </div>

      {/* live pill */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-neg live-dot" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-neg">
          Live
        </span>
        <span className="rounded bg-white/10 px-1 text-[9px] font-medium uppercase tracking-wider text-dim">
          Demo
        </span>
      </div>

      {/* viewers + uptime */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-md bg-black/55 px-2.5 py-1 backdrop-blur">
        <span className="mono text-[11px] text-fg">
          {formatNumber(viewers)} <span className="text-faint">watching</span>
        </span>
        <span className="mono text-[11px] text-faint">
          {mm}:{ss}
        </span>
      </div>
    </div>
  );
}
