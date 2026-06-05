import type { ConnectionState } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLOR: Record<ConnectionState, string> = {
  idle: "#5b616e",
  connecting: "#f5b54a",
  reconnecting: "#f5b54a",
  connected: "#2ee6a6",
  error: "#ff5c7c",
};

const LABEL: Record<ConnectionState, string> = {
  idle: "Idle",
  connecting: "Connecting",
  reconnecting: "Reconnecting",
  connected: "Live",
  error: "Error",
};

export function ConnectionDot({
  state,
  withLabel,
  className,
}: {
  state: ConnectionState;
  withLabel?: boolean;
  className?: string;
}) {
  const color = COLOR[state];
  const animate = state === "connected" || state === "connecting" || state === "reconnecting";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative flex h-2 w-2">
        {animate && (
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-60 live-dot"
            style={{ background: color }}
          />
        )}
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </span>
      {withLabel && (
        <span className="text-[11px] font-medium" style={{ color }}>
          {LABEL[state]}
        </span>
      )}
    </span>
  );
}
