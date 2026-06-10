"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Tv } from "lucide-react";
import { useDeck, channelKey } from "@/lib/store";
import { PLATFORMS, type StreamChannel } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { PlatformIcon } from "./icons";

// The demo broadcast: a real Market Bubble episode (Ansem + Banks, presented by
// Polymarket — "Why Ansem Thinks Ethereum Is Done.. | Market Bubble #4"). Served
// from YouTube so it autoplays muted with zero clicks. Swap demo OFF + add a
// live Twitch/Kick channel for a real first-party source.
const DEMO_VIDEO_ID = "F4OhqZjtVkY";
const DEMO_START = 200; // jump past the intro, straight into the conversation

function ShowReplay() {
  return (
    <div className="relative h-full w-full bg-black">
      <iframe
        id="mb-show-embed"
        src={`https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}?autoplay=1&mute=1&controls=0&rel=0&iv_load_policy=3&disablekb=1&modestbranding=1&playsinline=1&enablejsapi=1&start=${DEMO_START}&loop=1&playlist=${DEMO_VIDEO_ID}`}
        title="Market Bubble — episode replay"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="h-full w-full"
        frameBorder={0}
      />
      <div className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-neg live-dot" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-neg">
          Replay
        </span>
        <span className="rounded bg-white/10 px-1 text-[9px] font-medium uppercase tracking-wider text-dim">
          Market Bubble
        </span>
      </div>
    </div>
  );
}

function StreamEmbed({
  stream,
  host,
  demo,
}: {
  stream: StreamChannel;
  host: string | null;
  demo: boolean;
}) {
  const { platform, channel } = stream;

  if (demo) return <ShowReplay />;

  if (platform === "twitch") {
    if (!host) return <EmbedSkeleton />;
    // Real metadata says offline -> clean branded offline card instead of
    // Twitch's own "channel is offline" embed.
    if (stream.isLive === false) return <OfflineCard stream={stream} />;
    const src = `https://player.twitch.tv/?channel=${encodeURIComponent(
      channel,
    )}&parent=${host}&muted=true&autoplay=true`;
    return (
      <iframe
        key={`tw-${channel}`}
        src={src}
        title={`Twitch ${channel}`}
        allowFullScreen
        className="h-full w-full"
        frameBorder={0}
      />
    );
  }

  if (platform === "kick") {
    const src = `https://player.kick.com/${encodeURIComponent(channel)}?muted=true&autoplay=true`;
    return (
      <iframe
        key={`kick-${channel}`}
        src={src}
        title={`Kick ${channel}`}
        allowFullScreen
        className="h-full w-full"
        frameBorder={0}
      />
    );
  }

  // X has no reliable public live-video embed; present a clean branded card.
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#0a0c12] text-center">
      <PlatformIcon platform="x" className="h-9 w-9 text-x" />
      <div className="text-sm font-medium text-fg">@{channel} on X</div>
      <p className="max-w-xs px-6 text-xs text-faint">
        X has no public live-video embed. Chat from X is merged into the unified
        feed; open the broadcast on X to watch.
      </p>
      <a
        href={`https://x.com/${channel}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-white/15"
      >
        Open on X <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function EmbedSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0c12]">
      <Tv className="h-8 w-8 animate-pulse text-faint" />
    </div>
  );
}

function OfflineCard({ stream }: { stream: StreamChannel }) {
  const meta = PLATFORMS[stream.platform];
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#0a0c12] text-center">
      <PlatformIcon
        platform={stream.platform}
        className="h-8 w-8 opacity-60"
        style={{ color: meta.accent }}
      />
      <div className="text-sm font-medium text-fg">{stream.channel}</div>
      <div className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
        Offline
      </div>
      {stream.title && (
        <p className="mt-1 max-w-xs px-6 text-[11px] text-faint line-clamp-2">
          Last: {stream.title}
        </p>
      )}
    </div>
  );
}

export function StreamWatch() {
  const channels = useDeck((s) => s.channels);
  const activeStream = useDeck((s) => s.activeStream);
  const setActiveStream = useDeck((s) => s.setActiveStream);
  const demoMode = useDeck((s) => s.demoMode);
  const [host, setHost] = useState<string | null>(null);

  useEffect(() => {
    // Read the embedding host post-mount (Twitch's `parent` param). Done in an
    // effect to keep SSR and the first client render identical (no hydration
    // mismatch); the value only exists in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHost(window.location.hostname);
  }, []);

  const active =
    channels.find((c) => channelKey(c.platform, c.channel) === activeStream) ??
    channels[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video min-h-[188px] overflow-hidden rounded-xl bg-black ring-1 ring-border">
        {active ? (
          <StreamEmbed stream={active} host={host} demo={demoMode} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
            <Tv className="h-8 w-8 text-faint" />
            <p className="text-xs text-faint">
              Add a source to watch the stream here.
            </p>
          </div>
        )}
        {active && !demoMode && (
          <div className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 backdrop-blur">
            <PlatformIcon
              platform={active.platform}
              className="h-3 w-3"
              style={{ color: PLATFORMS[active.platform].accent }}
            />
            <span className="text-[11px] font-medium text-fg">
              {active.channel}
            </span>
            {!demoMode && active.isLive && (
              <span className="ml-0.5 flex items-center gap-1 rounded bg-neg/20 px-1 text-[9px] font-bold uppercase tracking-wider text-neg">
                <span className="h-1 w-1 rounded-full bg-neg live-dot" /> Live
              </span>
            )}
          </div>
        )}
        {active && !demoMode && active.isLive && active.viewers ? (
          <div className="pointer-events-none absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 backdrop-blur">
            <span className="mono text-[11px] text-fg">
              {formatNumber(active.viewers)}
            </span>
            <span className="text-[10px] text-faint">watching</span>
          </div>
        ) : null}
      </div>

      {channels.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {channels.map((c) => {
            const key = channelKey(c.platform, c.channel);
            const meta = PLATFORMS[c.platform];
            const isActive = key === channelKey(active.platform, active.channel);
            return (
              <button
                key={key}
                onClick={() => setActiveStream(key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition",
                  isActive
                    ? "bg-white/[0.08] text-fg ring-1 ring-border-strong"
                    : "bg-white/[0.02] text-faint hover:text-dim",
                )}
              >
                <PlatformIcon
                  platform={c.platform}
                  className="h-3 w-3"
                  style={{ color: isActive ? meta.accent : undefined }}
                />
                {c.channel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
