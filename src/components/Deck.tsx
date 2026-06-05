"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import {
  Group,
  Panel,
  type GroupImperativeHandle,
} from "react-resizable-panels";
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
import { ResizeHandle } from "./ResizeHandle";

const SEED = [
  { platform: "twitch" as const, channel: "marketbubble" },
  { platform: "kick" as const, channel: "marketbubble" },
  { platform: "x" as const, channel: "marketbubble" },
];

const LAYOUT_KEY = "mb-deck.layout.v1";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export function Deck() {
  const addChannel = useDeck((s) => s.addChannel);
  const hydrate = useDeck((s) => s.hydrate);
  const channelCount = useDeck((s) => s.channels.length);
  const toggleDemo = useDeck((s) => s.toggleDemo);
  const refreshMeta = useDeck((s) => s.refreshMeta);
  const setEmotesReady = useDeck((s) => s.setEmotesReady);
  const demoMode = useDeck((s) => s.demoMode);
  const seeded = useRef(false);
  const isDesktop = useIsDesktop();
  const groupRef = useRef<GroupImperativeHandle | null>(null);

  useEffect(() => {
    void loadEmotes().then(setEmotesReady);
  }, [setEmotesReady]);

  useEffect(() => {
    if (seeded.current || channelCount > 0) return;
    seeded.current = true;
    const session = loadSession();
    if (session && session.channels.length) {
      hydrate(session.channels, session.demoMode, session.soundOn);
    } else {
      for (const s of SEED) addChannel(s.platform, s.channel);
    }
  }, [addChannel, hydrate, channelCount]);

  useEffect(() => {
    if (demoMode) return;
    refreshMeta();
    const id = setInterval(refreshMeta, 60_000);
    return () => clearInterval(id);
  }, [demoMode, refreshMeta, channelCount]);

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

  // Restore the saved panel layout once the desktop group is mounted.
  useEffect(() => {
    if (!isDesktop) return;
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(LAYOUT_KEY) : null;
    if (!saved) return;
    try {
      const layout = JSON.parse(saved);
      // wait a frame so the Group is mounted
      requestAnimationFrame(() => groupRef.current?.setLayout(layout));
    } catch {
      // ignore malformed
    }
  }, [isDesktop]);

  const leftRail = (
    <aside className="panel flex h-full min-h-0 flex-col p-3.5">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ChannelManager />
      </div>
      <div className="hairline my-3 shrink-0" />
      <div className="shrink-0">
        <SourceLegend />
      </div>
    </aside>
  );

  const centerMain = (
    <main className="panel flex h-full min-h-0 flex-col overflow-hidden">
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
  );

  const rightRail = (
    <aside className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <section className="panel p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="eyebrow">Watch</span>
          <span className="eyebrow">native multistream</span>
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
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <LandingTitle />
      <CommandPalette />
      <TopBar />
      <div className="relative z-10 border-b border-border bg-bg-soft/40">
        <TickerRail />
      </div>

      {isDesktop ? (
        <Group
          orientation="horizontal"
          groupRef={groupRef}
          onLayoutChanged={(layout) => {
            try {
              localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
            } catch {
              // ignore
            }
          }}
          className="relative z-10 min-h-0 flex-1 p-3"
        >
          <Panel
            id="left"
            defaultSize="17%"
            minSize="13%"
            maxSize="26%"
            className="min-w-0"
          >
            {leftRail}
          </Panel>
          <ResizeHandle />
          <Panel id="center" defaultSize="53%" minSize="34%" className="min-w-0">
            {centerMain}
          </Panel>
          <ResizeHandle />
          <Panel
            id="right"
            defaultSize="30%"
            minSize="22%"
            maxSize="42%"
            className="min-w-0"
          >
            {rightRail}
          </Panel>
        </Group>
      ) : (
        <div className="relative z-10 min-h-0 flex-1 p-3">{centerMain}</div>
      )}
    </div>
  );
}
