"use client";

import { useEffect, useState } from "react";
import { HOSTS, PLATFORMS, SHOW, type StreamChannel } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { PlatformIcon } from "./icons";

// A branded "on air" stage shown in demo mode in place of a real embed. Styled
// as the Market Bubble show broadcasting with its two hosts, so the deployed
// deck reads as an intentional broadcast (not an offline third-party player).
// Swap demo OFF and add a live channel to embed the real Twitch/Kick stream.
export function DemoStage({ stream }: { stream: StreamChannel }) {
  const meta = PLATFORMS[stream.platform];
  const [viewers, setViewers] = useState(29540);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setViewers((v) => Math.max(800, v + Math.round((Math.random() - 0.42) * 140)));
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 90% at 50% -10%, rgba(177,108,255,0.18), transparent 60%), linear-gradient(160deg,#0c0e16,#06070b)",
      }}
    >
      {/* faint studio grid */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
          maskImage:
            "radial-gradient(120% 100% at 50% 40%, #000 30%, transparent 82%)",
        }}
      />

      {/* the two hosts, broadcast two-shot */}
      <div className="relative flex flex-col items-center gap-5 px-6">
        <div className="flex items-center gap-5 sm:gap-9">
          {HOSTS.map((h) => (
            <div key={h.id} className="flex flex-col items-center gap-2">
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-full text-[20px] font-bold sm:h-20 sm:w-20 sm:text-[24px]"
                style={{
                  color: h.accent,
                  background:
                    "radial-gradient(circle at 38% 30%, rgba(255,255,255,0.10), rgba(255,255,255,0.02))",
                  boxShadow: `inset 0 0 0 1.5px ${h.accent}66, 0 0 30px ${h.accent}33`,
                }}
              >
                {h.name[0]}
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: "#0a0c12", boxShadow: `inset 0 0 0 1px ${h.accent}55` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full live-dot" style={{ background: h.accent }} />
                </span>
              </div>
              <div className="text-center">
                <div className="text-[13px] font-semibold text-fg">{h.name}</div>
                <div className="text-[10px] text-faint">{h.role}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <div className="text-[15px] font-semibold tracking-tight text-fg">
            {SHOW.name}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-dim">
            <PlatformIcon
              platform={stream.platform}
              className="h-3.5 w-3.5"
              style={{ color: meta.accent }}
            />
            on {meta.name}
            <span className="ml-1 flex items-end gap-[2px]">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-[2px] origin-bottom rounded-full"
                  style={{
                    height: 10,
                    background: meta.accent,
                    animation: `eq 0.9s ease-in-out ${i * 0.13}s infinite`,
                  }}
                />
              ))}
            </span>
          </div>
        </div>
      </div>

      {/* on-air pill */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-neg live-dot" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-neg">
          On Air
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
