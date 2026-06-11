"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Tv } from "lucide-react";
import { useDeck, channelKey } from "@/lib/store";
import { PLATFORMS, type StreamChannel } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { PlatformIcon } from "./icons";

// The demo broadcast: the real Market Bubble Twitch broadcast (FaZe Banks +
// Ansem, Polymarket lower-third), full-bleed and uncropped via Twitch's JS
// player. Twitch gates VOD playback behind a user gesture, so playback is
// "armed": window.__armShowPlayback() starts it synchronously from the demo
// film's Shift+T keydown, and any first click/keypress on the page also starts
// it as a fallback.
const DEMO_VOD_ID = "2788673017"; // fazebanks — Market Bubble broadcast
const DEMO_VOD_START = "14m00s"; // straight into the conversation

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwitchGlobal = { Player: any };

function ShowReplay({ host }: { host: string | null }) {
  const mountRef = useRef<HTMLDivElement>(null);
  // While the player isn't rolling (fresh mount, or a view-switch remounted it
  // and Twitch wants a new gesture), cover its paused chrome with a branded
  // card. Click-through still reaches the player, so one tap starts it.
  const [covered, setCovered] = useState(true);

  useEffect(() => {
    if (!host || !mountRef.current) return;
    const mount = mountRef.current;
    let cancelled = false;
    let ready = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let player: any;

    const start = () => {
      try {
        player?.setMuted(true);
        player?.play();
      } catch {
        /* ignore */
      }
    };
    // Truthful "is it rolling" check: the preview gate reports isPaused=false,
    // so trust only PLAYING/PAUSE events plus an advancing playhead.
    let lastT = -1;
    const watch = setInterval(() => {
      try {
        if (!ready || !player || typeof player.getCurrentTime !== "function") {
          setCovered(true);
          return;
        }
        const t = player.getCurrentTime();
        if (typeof t === "number") {
          setCovered(!(t > lastT + 0.1));
          lastT = t;
        }
      } catch {
        /* ignore */
      }
    }, 900);
    const create = () => {
      const Twitch = (window as unknown as { Twitch?: TwitchGlobal }).Twitch;
      if (cancelled || !Twitch?.Player || !mount) return;
      mount.innerHTML = "";
      player = new Twitch.Player(mount, {
        video: DEMO_VOD_ID,
        parent: [host],
        autoplay: true,
        muted: true,
        time: DEMO_VOD_START,
        width: "100%",
        height: "100%",
      });
      player.addEventListener(Twitch.Player.READY, () => {
        ready = true;
        start();
      });
      player.addEventListener(Twitch.Player.PLAYING, () => setCovered(false));
      player.addEventListener(Twitch.Player.PAUSE, () => setCovered(true));
      player.addEventListener(Twitch.Player.ENDED, () => setCovered(true));
      (window as unknown as { __armShowPlayback?: () => void }).__armShowPlayback = start;
    };

    const existing = (window as unknown as { Twitch?: TwitchGlobal }).Twitch;
    if (existing?.Player) {
      create();
    } else {
      const id = "twitch-embed-js";
      let sc = document.getElementById(id) as HTMLScriptElement | null;
      if (sc) {
        sc.addEventListener("load", create);
      } else {
        sc = document.createElement("script");
        sc.id = id;
        sc.src = "https://player.twitch.tv/js/embed/v1.js";
        sc.onload = create;
        document.body.appendChild(sc);
      }
    }
    // fallback: the first real interaction anywhere starts playback
    const onGesture = () => start();
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    return () => {
      cancelled = true;
      clearInterval(watch);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      delete (window as unknown as { __armShowPlayback?: () => void }).__armShowPlayback;
    };
  }, [host]);

  return (
    <div className="relative h-full w-full bg-black">
      <div ref={mountRef} id="mb-show-embed" className="h-full w-full" />
      {covered && (
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{
            background:
              "radial-gradient(80% 70% at 50% 40%, #141210, #0a0a09 75%)",
          }}
        >
          <span
            className="h-12 w-12 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 38% 30%, #fefdfb, #ece3d0 34%, #bcab86 70%, #6f6450)",
              boxShadow: "0 6px 26px rgba(233,225,209,.3)",
            }}
          />
          <span className="font-serif text-[17px] font-semibold text-fg">
            Market Bubble
          </span>
          <span className="eyebrow">Replay · tap to play</span>
        </div>
      )}
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

  if (demo) return <ShowReplay host={host} />;

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
