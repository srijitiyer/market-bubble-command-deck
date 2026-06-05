import { PLATFORMS, type Platform } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "./icons";

interface Props {
  platform: Platform;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function SourceBadge({
  platform,
  size = "sm",
  showLabel = true,
  className,
}: Props) {
  const meta = PLATFORMS[platform];
  const dims = {
    xs: "h-4 w-4 text-[9px]",
    sm: "h-5 w-5 text-[10px]",
    md: "h-6 w-6 text-xs",
  }[size];
  const icon = {
    xs: "h-2.5 w-2.5",
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
  }[size];

  if (!showLabel) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md",
          dims,
          className,
        )}
        style={{
          background: meta.tint,
          color: meta.accent,
          boxShadow: `inset 0 0 0 1px ${meta.accent}33`,
        }}
        title={meta.name}
      >
        <PlatformIcon platform={platform} className={icon} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium tracking-wide",
        size === "md" ? "text-xs" : "text-[10px]",
        className,
      )}
      style={{
        background: meta.tint,
        color: meta.accent,
        boxShadow: `inset 0 0 0 1px ${meta.accent}33`,
      }}
    >
      <PlatformIcon platform={platform} className={icon} />
      <span className="uppercase">{meta.name}</span>
    </span>
  );
}
