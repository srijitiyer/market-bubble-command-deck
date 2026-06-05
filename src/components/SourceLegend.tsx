import { PLATFORMS } from "@/lib/types";
import { PlatformIcon } from "./icons";

const ROWS = [
  {
    platform: "twitch" as const,
    how: "Live read",
    detail: "Anonymous IRC over WebSocket. No auth, real-time.",
  },
  {
    platform: "kick" as const,
    how: "Live read",
    detail: "Pusher socket. Auto-resolves room; paste chatroom id if blocked.",
  },
  {
    platform: "x" as const,
    how: "Replay",
    detail: "X has no public live-chat API. Pluggable adapter; replay for now.",
  },
];

export function SourceLegend() {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
        How sourcing works
      </h3>
      <div className="flex flex-col gap-1.5">
        {ROWS.map((r) => {
          const meta = PLATFORMS[r.platform];
          return (
            <div key={r.platform} className="flex items-start gap-2">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                style={{ background: meta.tint, color: meta.accent }}
              >
                <PlatformIcon platform={r.platform} className="h-3 w-3" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-fg">
                    {meta.name}
                  </span>
                  <span
                    className="rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                    style={{
                      background: r.how === "Replay" ? "rgba(245,181,74,0.14)" : "rgba(46,230,166,0.12)",
                      color: r.how === "Replay" ? "#f5b54a" : "#2ee6a6",
                    }}
                  >
                    {r.how}
                  </span>
                </div>
                <p className="text-[10px] leading-snug text-faint">{r.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
