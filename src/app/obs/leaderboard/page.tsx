"use client";

import { Leaderboard } from "@/components/Leaderboard";
import { ObsFrame, useObsBoot } from "@/components/ObsShell";

// OBS browser source: the live chat leaderboard as a transparent overlay.
// e.g. /obs/leaderboard?framed=0
export default function ObsLeaderboardPage() {
  const opts = useObsBoot();
  if (!opts) return null;
  return (
    <div className="max-w-md">
      <ObsFrame framed={opts.framed}>
        <Leaderboard />
      </ObsFrame>
    </div>
  );
}
