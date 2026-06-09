"use client";

import { useDeck } from "@/lib/store";
import { SHOW } from "@/lib/types";
import { StreamWatch } from "./StreamWatch";
import { UnifiedFeed } from "./UnifiedFeed";
import { FeedToolbar } from "./FeedToolbar";
import { FeaturedBar } from "./FeaturedBar";
import { SharedComposer } from "./SharedComposer";
import { StatsDeck } from "./StatsDeck";
import { SentimentMeter } from "./SentimentMeter";
import { PolymarketOdds } from "./PolymarketOdds";
import { AudiencePanel } from "./AudiencePanel";
import { PanelHeader } from "./PanelHeader";
import { HostSwitch } from "./HostSwitch";

// The hero "broadcast control room": the stream is the centerpiece, the merged
// live chat runs as a tall rail beside it, and the intelligence (stats,
// sentiment, Polymarket odds, audience) sits underneath. This is the view that
// goes head-to-head with the competitor's center-stage layout — except our chat
// is genuinely real-time and merged across all three platforms.
export function StageView() {
  const channelCount = useDeck((s) => s.channels.length);

  return (
    <div className="flex min-h-0 flex-1 gap-3 p-3">
      {/* LEFT — stage + intelligence */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
        {/* hero stream */}
        <section className="flex shrink-0 flex-col gap-2">
          {/* stage header — the show identity, on brand */}
          <div className="flex items-center justify-between gap-3 px-0.5">
            <div className="flex items-center gap-2 text-[12px] text-dim">
              {SHOW.pillars.map((p, i) => (
                <span key={p} className="flex items-center gap-2">
                  {i > 0 && <span className="text-faint">·</span>}
                  <span className="font-medium text-fg/90">{p}</span>
                </span>
              ))}
            </div>
            <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1 ring-1 ring-border">
              <span className="h-1.5 w-1.5 rounded-full bg-neg live-dot" />
              <span className="eyebrow text-dim">{SHOW.schedule}</span>
            </span>
          </div>
          <div className="relative" data-tour="hero">
            <StreamWatch />
            <div className="pointer-events-none absolute right-2.5 top-2.5">
              <div className="pointer-events-auto" data-tour="hostswitch">
                <HostSwitch />
              </div>
            </div>
          </div>
        </section>

        {/* intelligence strip */}
        <div className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-3">
          <section className="panel flex flex-col p-4">
            <StatsDeck />
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
        className="panel flex w-[380px] shrink-0 flex-col overflow-hidden xl:w-[420px]"
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
  );
}
