import { PLATFORMS } from "@/lib/types";
import { PlatformIcon } from "./icons";

const ROWS = [
  { platform: "twitch" as const, mode: "Live", detail: "anon IRC, real-time" },
  { platform: "kick" as const, mode: "Live", detail: "Pusher socket" },
  { platform: "x" as const, mode: "Replay", detail: "no public chat API" },
];

export function SourceLegend() {
  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow">Connection fidelity</span>
      <div className="flex flex-col gap-1">
        {ROWS.map((r) => {
          const meta = PLATFORMS[r.platform];
          const replay = r.mode === "Replay";
          return (
            <div key={r.platform} className="flex items-center gap-2">
              <PlatformIcon
                platform={r.platform}
                className="h-3 w-3 shrink-0"
                style={{ color: meta.accent }}
              />
              <span className="w-10 shrink-0 text-[11px] font-medium text-fg">
                {meta.name}
              </span>
              <span
                className="h-1 w-1 shrink-0 rounded-full"
                style={{
                  background: replay ? "var(--color-warn)" : "var(--color-pos)",
                }}
              />
              <span
                className="shrink-0 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  color: replay ? "var(--color-warn)" : "var(--color-pos)",
                }}
              >
                {r.mode}
              </span>
              <span className="truncate text-[10px] text-faint">· {r.detail}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
