import type { SVGProps } from "react";
import type { Platform } from "@/lib/types";

export function TwitchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M4.265 0 1.6 4.064v15.05h5.067V24l4.266-4.886h3.733L21.6 12V0H4.265Zm15.467 11.2-3.2 3.2h-3.733l-2.667 2.4v-2.4H6.667V1.6h13.065V11.2Z" />
      <path d="M17.6 4.8h-1.6v4.8h1.6V4.8ZM13.067 4.8h-1.6v4.8h1.6V4.8Z" />
    </svg>
  );
}

export function KickIcon(props: SVGProps<SVGSVGElement>) {
  // Kick's blocky green "K", drawn as stepped rectangles.
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden {...props}>
      <path d="M3 3h7v7h3V6.5h3V3h7v7h-3.5v3.5h-3V17h3v3.5H23V24h-7v-3.5h-3V17h-3v8H3V3Z" />
    </svg>
  );
}

export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.656l-5.214-6.817-5.966 6.817H1.683l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

export function PlatformIcon({
  platform,
  ...props
}: { platform: Platform } & SVGProps<SVGSVGElement>) {
  if (platform === "twitch") return <TwitchIcon {...props} />;
  if (platform === "kick") return <KickIcon {...props} />;
  return <XIcon {...props} />;
}

// Market Bubble mark — a glossy orb echoing the purple bubble in their branding.
export function BubbleMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden {...props}>
      <defs>
        <radialGradient id="mb-orb" cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#fefdfb" />
          <stop offset="34%" stopColor="#ece3d0" />
          <stop offset="70%" stopColor="#bcab86" />
          <stop offset="100%" stopColor="#6f6450" />
        </radialGradient>
        <radialGradient id="mb-hi" cx="34%" cy="28%" r="30%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#mb-orb)" />
      <ellipse cx="18" cy="16" rx="7" ry="5" fill="url(#mb-hi)" />
      <circle
        cx="24"
        cy="24"
        r="18"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="0.75"
      />
    </svg>
  );
}
