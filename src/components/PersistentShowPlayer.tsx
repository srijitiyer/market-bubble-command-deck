"use client";

import { useEffect, useRef } from "react";

// The demo broadcast as a SINGLETON <video> that never unmounts. View switches
// (Stage <-> Deck <-> sections) remount their stream *tiles*, so each tile
// renders an empty [data-show-slot] and this one video element is RE-PARENTED
// into whichever slot is currently on screen. Moving a <video> in the DOM
// preserves its playback (unlike an iframe), so the broadcast plays seamlessly
// across every view — and because it lives INSIDE the slot, the on-stream
// controls (the host switch) sit naturally above it and the stage's zoom
// carries it, with no floating overlay covering anything.
//
// A self-hosted muted clip (a real segment of the show) instead of the Twitch
// embed: it autoplays with no user gesture, loops, and never pauses on resize
// or viewport changes — none of the embed's failure modes exist.
const SHOW_SRC = "/broadcast.mp4";

export function PersistentShowPlayer() {
  const holderRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const holder = holderRef.current;
    if (!video || !holder) return;

    const play = () => {
      video.muted = true;
      void video.play().catch(() => {});
    };
    play();
    (window as unknown as { __armShowPlayback?: () => void }).__armShowPlayback = play;
    (window as unknown as { __showPlayer?: HTMLVideoElement }).__showPlayer = video;

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const slot = document.querySelector("[data-show-slot]");
      const target = (slot as HTMLElement) || holder;
      if (video.parentElement !== target) {
        target.appendChild(video);
        video.className = slot
          ? "absolute inset-0 h-full w-full object-cover"
          : "h-px w-px";
        play(); // a brief detach during a remount can pause it; resume now
      }
    };
    raf = requestAnimationFrame(tick);

    const onVis = () => {
      if (!document.hidden) play();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      delete (window as unknown as { __armShowPlayback?: () => void }).__armShowPlayback;
    };
  }, []);

  // Holder keeps the video in the document whenever no slot is mounted (a
  // section without a stream tile), so playback never stops between views.
  return (
    <div
      ref={holderRef}
      aria-hidden
      style={{
        position: "fixed",
        left: -9999,
        top: -9999,
        width: 0,
        height: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <video
        ref={videoRef}
        src={SHOW_SRC}
        muted
        autoPlay
        loop
        playsInline
        preload="auto"
        className="h-px w-px"
      />
    </div>
  );
}
