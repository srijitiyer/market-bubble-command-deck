"use client";

import { Pin, X as XClose } from "lucide-react";
import { useDeck } from "@/lib/store";
import { PLATFORMS } from "@/lib/types";
import { PlatformIcon } from "./icons";

// The "featured message" slot — the streamer highlight-to-overlay pattern.
// Pinning any message from the feed surfaces it here, styled like an OBS
// overlay card, so it can be shown on stream above the noise.
export function FeaturedBar() {
  const featured = useDeck((s) => s.featured);
  const setFeatured = useDeck((s) => s.setFeatured);
  if (!featured) return null;

  const meta = PLATFORMS[featured.platform];

  return (
    <div className="border-b border-border px-3 py-2">
      <div
        className="relative flex items-start gap-2.5 overflow-hidden rounded-xl border px-3 py-2.5"
        style={{
          borderColor: "rgba(184,139,255,0.3)",
          background:
            "linear-gradient(100deg, rgba(184,139,255,0.1), rgba(138,160,255,0.05))",
        }}
      >
        <div className="flex items-center gap-1.5 pt-0.5">
          <Pin className="h-3.5 w-3.5 text-brand" />
        </div>
        <span
          className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
          style={{
            background: meta.tint,
            color: meta.accent,
            boxShadow: `inset 0 0 0 1px ${meta.accent}40`,
          }}
        >
          <PlatformIcon platform={featured.platform} className="h-3 w-3" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="eyebrow" style={{ color: "var(--color-brand)" }}>
              Featured
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: featured.isHost ? "var(--color-brand)" : featured.color }}
            >
              {featured.displayName}
            </span>
          </div>
          <div className="mt-0.5 break-words text-[13px] text-fg">
            {featured.text}
          </div>
        </div>
        <button
          onClick={() => setFeatured(null)}
          className="rounded p-0.5 text-faint transition hover:bg-white/10 hover:text-fg"
          title="Unpin"
          aria-label="Unpin featured message"
        >
          <XClose className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
