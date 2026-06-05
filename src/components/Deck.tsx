"use client";

import { useEffect, useRef, useState } from "react";
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
import { PanelHeader } from "./PanelHeader";
import { DemoTour } from "./DemoTour";

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

  // Expose the panel-layout setter for scripted demo walkthroughs (harmless).
  useEffect(() => {
    (window as unknown as { __mbSetLayout?: (l: Record<string, number>) => void }).__mbSetLayout =
      (l) => groupRef.current?.setLayout(l);
    return () => {
      delete (window as unknown as { __mbSetLayout?: unknown }).__mbSetLayout;
    };
  }, []);

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
    <aside className="panel flex h-full min-h-0 flex-col">
      <PanelHeader
        title="Sources"
        aside={<span className="mono text-[11px] text-faint">{channelCount}</span>}
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <ChannelManager />
      </div>
      <div className="shrink-0 border-t border-border p-4">
        <SourceLegend />
      </div>
    </aside>
  );

  const centerMain = (
    <main className="panel flex h-full min-h-0 flex-col overflow-hidden">
      <PanelHeader
        title="Unified Feed"
        aside={<span className="eyebrow">live · merged · labeled</span>}
      />
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
      <section className="panel flex shrink-0 flex-col overflow-hidden">
        <PanelHeader
          title="Watch"
          aside={<span className="eyebrow">native multistream</span>}
        />
        <div className="p-4">
          <StreamWatch />
        </div>
      </section>
      <section className="panel flex shrink-0 flex-col">
        <PanelHeader title="Intelligence" />
        <div className="flex flex-col gap-6 p-4">
          <StatsDeck />
          <SentimentMeter />
          <AudiencePanel />
          <TopChatters />
        </div>
      </section>
    </aside>
  );

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      {/* fixed overlays — siblings of the stage so they aren't affected by the
          tour's zoom transform */}
      <LandingTitle />
      <CommandPalette />
      <DemoTour />

      {/* the zoomable stage (everything the tour can zoom into) */}
      <div
        id="deck-stage"
        className="flex min-h-0 flex-1 flex-col"
        style={{ transformOrigin: "0 0", willChange: "transform" }}
      >
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
            maxSize="24%"
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
            maxSize="38%"
            className="min-w-0"
          >
            {rightRail}
          </Panel>
        </Group>
      ) : (
        <div className="relative z-10 min-h-0 flex-1 p-3">{centerMain}</div>
      )}
      </div>
    </div>
  );
}
