"use client";

import { useDeck } from "@/lib/store";
import { SHOW } from "@/lib/types";
import { StreamWatch } from "./StreamWatch";
import { UnifiedFeed } from "./UnifiedFeed";
import { FeedToolbar } from "./FeedToolbar";
import { FeaturedBar } from "./FeaturedBar";
import { SharedComposer } from "./SharedComposer";
import { SentimentMeter } from "./SentimentMeter";
import { PolymarketOdds } from "./PolymarketOdds";
import { AudiencePanel } from "./AudiencePanel";
import { Leaderboard } from "./Leaderboard";
import { HeroStatBar } from "./HeroStatBar";
import { PanelHeader } from "./PanelHeader";
import { HostSwitch } from "./HostSwitch";

// The hero "broadcast control room": bold live stats up top, the stream as the
// centerpiece, the merged real-time chat as a tall rail beside it, and the
// intelligence (live leaderboard, sentiment+audience, Polymarket odds) below.
// Goes head-to-head with the competitor's center-stage layout — except our
// chat, stats, leaderboard and odds are all genuinely live.
export function StageView() {
  const channelCount = useDeck((s) => s.channels.length);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      {/* bold live stats — the broadcast's vital signs, the visual anchor */}
      <section className="flex shrink-0 items-end justify-between gap-4 px-0.5">
        <HeroStatBar />
        <span className="hidden shrink-0 items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1 ring-1 ring-border md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-neg live-dot" />
          <span className="eyebrow text-dim">{SHOW.schedule}</span>
        </span>
      </section>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* LEFT — stage + intelligence */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
          {/* hero stream — centered and height-capped so the intelligence strip
              stays on-screen, and it reads as a broadcast not a sidebar */}
          <section className="shrink-0">
            <div
              className="relative mx-auto w-full"
              data-tour="hero"
              style={{ maxWidth: "calc((100dvh - 360px) * 16 / 9)" }}
            >
              <StreamWatch />
              <div className="pointer-events-none absolute right-2.5 top-2.5">
                <div className="pointer-events-auto" data-tour="hostswitch">
                  <HostSwitch />
                </div>
              </div>
            </div>
          </section>

          {/* intelligence strip */}
          <div className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-3">
            <section className="panel flex flex-col p-4">
              <Leaderboard />
            </section>
            <section
              className="panel flex flex-col gap-5 p-4"
              data-tour="audience"
            >
              <SentimentMeter />
              <AudiencePanel />
            </section>
            <section className="panel flex flex-col p-4" data-tour="odds">
              <PolymarketOdds />
            </section>
          </div>
        </div>

        {/* RIGHT — the merged live chat */}
        <aside
          className="panel flex w-[clamp(360px,28vw,460px)] shrink-0 flex-col overflow-hidden"
          data-tour="chat"
        >
          <PanelHeader
            title="Unified Feed"
            aside={
              <span className="mono text-[11px] text-faint">
                {channelCount} live · merged
              </span>
            }
          />
          <FeedToolbar />
          <FeaturedBar />
          <div className="min-h-0 flex-1">
            <UnifiedFeed />
          </div>
          <SharedComposer />
        </aside>
      </div>
    </div>
  );
}
