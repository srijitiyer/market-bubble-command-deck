"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Tv } from "lucide-react";
import { useDeck, channelKey } from "@/lib/store";
import { PLATFORMS, type StreamChannel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "./icons";
import { DemoStage } from "./DemoStage";

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

  if (demo) return <DemoStage stream={stream} />;

  if (platform === "twitch") {
    if (!host) return <EmbedSkeleton />;
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
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black ring-1 ring-border">
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
        {active && (
          <div className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 backdrop-blur">
            <PlatformIcon
              platform={active.platform}
              className="h-3 w-3"
              style={{ color: PLATFORMS[active.platform].accent }}
            />
            <span className="text-[11px] font-medium text-fg">
              {active.channel}
            </span>
          </div>
        )}
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
