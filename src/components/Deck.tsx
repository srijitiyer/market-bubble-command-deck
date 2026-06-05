"use client";

import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { useDeck } from "@/lib/store";
import { TopBar } from "./TopBar";
import { ChannelManager } from "./ChannelManager";
import { StreamWatch } from "./StreamWatch";
import { UnifiedFeed } from "./UnifiedFeed";
import { FeedToolbar } from "./FeedToolbar";
import { StatsDeck, TopChatters } from "./StatsDeck";
import { AudiencePanel } from "./AudiencePanel";
import { SourceLegend } from "./SourceLegend";

// Channels seeded on first load so the deck is alive the moment it opens.
// Demo mode is on by default, so these run synthetic traffic; toggle Demo off
// and add a live channel (e.g. twitch / a live streamer) to ingest real chat.
const SEED = [
  { platform: "twitch" as const, channel: "marketbubble" },
  { platform: "kick" as const, channel: "marketbubble" },
  { platform: "x" as const, channel: "marketbubble" },
];

export function Deck() {
  const addChannel = useDeck((s) => s.addChannel);
  const channelCount = useDeck((s) => s.channels.length);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || channelCount > 0) return;
    seeded.current = true;
    for (const s of SEED) addChannel(s.platform, s.channel);
  }, [addChannel, channelCount]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar />

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)_392px]">
        {/* Left rail — sources */}
        <aside className="panel hidden min-h-0 flex-col gap-4 overflow-y-auto p-3.5 lg:flex">
          <ChannelManager />
          <div className="mt-auto h-px bg-border" />
          <SourceLegend />
        </aside>

        {/* Center — unified feed (hero) */}
        <main className="panel flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <MessageSquare className="h-4 w-4 text-brand" />
            <h1 className="text-sm font-semibold">Unified Feed</h1>
            <span className="hidden text-[11px] text-faint sm:inline">
              every chat, one stream, source-labeled
            </span>
          </div>
          <FeedToolbar />
          <div className="min-h-0 flex-1">
            <UnifiedFeed />
          </div>
        </main>

        {/* Right rail — watch + intelligence */}
        <aside className="hidden min-h-0 flex-col gap-3 overflow-y-auto xl:flex">
          <section className="panel p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dim">
                Watch
              </h2>
              <span className="text-[10px] text-faint">native multistream</span>
            </div>
            <StreamWatch />
          </section>

          <section className="panel flex flex-col gap-4 p-3.5">
            <StatsDeck />
            <div className="h-px bg-border" />
            <AudiencePanel />
            <div className="h-px bg-border" />
            <TopChatters />
          </section>
        </aside>
      </div>
    </div>
  );
}
