"use client";

import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { useDeck } from "@/lib/store";
import { loadSession } from "@/lib/persist";
import { loadEmotes } from "@/lib/emotes";
import { TopBar } from "./TopBar";
import { ChannelManager } from "./ChannelManager";
import { StreamWatch } from "./StreamWatch";
import { UnifiedFeed } from "./UnifiedFeed";
import { FeedToolbar } from "./FeedToolbar";
import { StatsDeck, TopChatters } from "./StatsDeck";
import { AudiencePanel } from "./AudiencePanel";
import { SourceLegend } from "./SourceLegend";
import { TickerRail } from "./TickerRail";
import { SentimentMeter } from "./SentimentMeter";
import { SharedComposer } from "./SharedComposer";
import { LandingTitle } from "./LandingTitle";
import { FeaturedBar } from "./FeaturedBar";
import { CommandPalette } from "./CommandPalette";

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
  const hydrate = useDeck((s) => s.hydrate);
  const channelCount = useDeck((s) => s.channels.length);
  const toggleDemo = useDeck((s) => s.toggleDemo);
  const refreshMeta = useDeck((s) => s.refreshMeta);
  const setEmotesReady = useDeck((s) => s.setEmotesReady);
  const demoMode = useDeck((s) => s.demoMode);
  const seeded = useRef(false);

  // Load global emote sets (7TV / BTTV / Twitch) once.
  useEffect(() => {
    void loadEmotes().then(setEmotesReady);
  }, [setEmotesReady]);

  useEffect(() => {
    if (seeded.current || channelCount > 0) return;
    seeded.current = true;
    // Restore the user's last session if any; otherwise seed the demo.
    const session = loadSession();
    if (session && session.channels.length) {
      hydrate(session.channels, session.demoMode, session.soundOn);
    } else {
      for (const s of SEED) addChannel(s.platform, s.channel);
    }
  }, [addChannel, hydrate, channelCount]);

  // Poll real Twitch stream metadata (live/viewers/title) while not in demo.
  useEffect(() => {
    if (demoMode) return;
    refreshMeta();
    const id = setInterval(refreshMeta, 60_000);
    return () => clearInterval(id);
  }, [demoMode, refreshMeta, channelCount]);

  // Power-user shortcuts: "/" focuses search, "d" toggles demo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("feed-search")?.focus();
      } else if (e.key === "d" || e.key === "D") {
        toggleDemo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleDemo]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <LandingTitle />
      <CommandPalette />
      <TopBar />
      <div className="relative z-10 border-b border-border bg-bg-soft/40">
        <TickerRail />
      </div>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)_392px]">
        {/* Left rail — sources */}
        <aside className="panel hidden min-h-0 flex-col gap-4 overflow-y-auto p-3.5 lg:flex">
          <ChannelManager />
          <div className="hairline" />
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
          <FeaturedBar />
          <div className="min-h-0 flex-1">
            <UnifiedFeed />
          </div>
          <SharedComposer />
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
            <div className="hairline" />
            <SentimentMeter />
            <div className="hairline" />
            <AudiencePanel />
            <div className="hairline" />
            <TopChatters />
          </section>
        </aside>
      </div>
    </div>
  );
}
