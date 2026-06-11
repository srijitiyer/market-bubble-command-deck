"use client";

import { PolymarketOdds } from "@/components/PolymarketOdds";
import { ObsFrame, useObsBoot } from "@/components/ObsShell";

// OBS browser source: live Polymarket odds as a transparent overlay.
// e.g. /obs/odds?limit=6&framed=0
export default function ObsOddsPage() {
  const opts = useObsBoot();
  if (!opts) return null;
  return (
    <div className="max-w-md">
      <ObsFrame framed={opts.framed}>
        <PolymarketOdds limit={Math.min(8, opts.limit)} />
      </ObsFrame>
    </div>
  );
}
