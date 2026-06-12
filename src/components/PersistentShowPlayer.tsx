"use client";

import { useEffect, useRef } from "react";

// The demo broadcast player as a SINGLETON that never unmounts. View switches
// (Stage <-> Deck <-> sections) remount their stream *tiles*, so the tiles
// render an empty [data-show-slot] and this floating <video> follows the slot's
// on-screen rect every frame, filling it with object-fit:cover (no letterbox
// bars). It lives OUTSIDE the zoomable #deck-stage and positions itself in true
// screen coordinates (position:fixed), reading the slot's already-transformed
// rect — so a beat can pan/zoom the slot anywhere and the video just tracks it.
//
// Why a self-hosted clip instead of the Twitch embed: the embed gated VOD
// playback behind a user gesture, PAUSED whenever its iframe was resized below
// 400x300 or judged insufficiently visible, and a paused VOD could not be
// resumed from script. A plain muted <video> autoplays with no gesture, loops,
// and never pauses on resize or viewport changes — none of those failure modes
// exist. The clip is a real segment of the show (same VOD, same start point).
const SHOW_SRC = "/broadcast.mp4";

export function PersistentShowPlayer() {
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // keep it playing (autoplay handles it; this is belt-and-suspenders) and
  // expose a harmless starter the tour can call
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const play = () => {
      v.muted = true;
      void v.play().catch(() => {});
    };
    play();
    (window as unknown as { __armShowPlayback?: () => void }).__armShowPlayback = play;
    (window as unknown as { __showPlayer?: HTMLVideoElement }).__showPlayer = v;
    // if the tab is backgrounded the browser may pause it; resume on return
    const onVis = () => {
      if (!document.hidden) play();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      delete (window as unknown as { __armShowPlayback?: () => void }).__armShowPlayback;
    };
  }, []);

  // follow the current view's slot every frame (cheap: dirty-checked writes)
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    let raf = 0;
    let drawn = { l: -1, t: -1, w: -1, h: -1, clip: "" };
    const hide = () => {
      if (el.style.visibility !== "hidden") el.style.visibility = "hidden";
      drawn = { l: -1, t: -1, w: -1, h: -1, clip: "" };
    };
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const slot = document.querySelector("[data-show-slot]");
      if (!slot) {
        hide();
        return;
      }
      const sr = slot.getBoundingClientRect();
      if (sr.width < 1 || sr.height < 1) {
        hide();
        return;
      }
      // box fills the slot exactly (object-fit:cover -> no bars). The slot's
      // rect already includes any tour zoom/pan, so the video reads at the
      // beat's scale automatically.
      const l = sr.left;
      const t = sr.top;
      const w = sr.width;
      const h = sr.height;
      // clip to the slot's visible region (intersection with overflow/scroll
      // ancestors + viewport) so a scrolled column or an off-screen pan can't
      // let the video bleed over neighbouring panels. A <video> never pauses,
      // so this is purely cosmetic.
      let cl = sr.left,
        ct = sr.top,
        cr = sr.right,
        cb = sr.bottom;
      let a = slot.parentElement;
      while (a && a !== document.body) {
        const cs = getComputedStyle(a);
        if (/(auto|scroll|hidden)/.test(cs.overflowY + cs.overflowX)) {
          const ar = a.getBoundingClientRect();
          cl = Math.max(cl, ar.left);
          ct = Math.max(ct, ar.top);
          cr = Math.min(cr, ar.right);
          cb = Math.min(cb, ar.bottom);
        }
        a = a.parentElement;
      }
      cl = Math.max(cl, 0);
      ct = Math.max(ct, 0);
      cr = Math.min(cr, window.innerWidth);
      cb = Math.min(cb, window.innerHeight);
      const it = Math.max(0, ct - t);
      const il = Math.max(0, cl - l);
      const ib = Math.max(0, sr.bottom - cb);
      const ir = Math.max(0, sr.right - cr);
      const clip =
        it + il + ib + ir < 0.5
          ? "none"
          : `inset(${it.toFixed(1)}px ${ir.toFixed(1)}px ${ib.toFixed(1)}px ${il.toFixed(1)}px round 12px)`;
      if (
        Math.abs(l - drawn.l) > 0.5 ||
        Math.abs(t - drawn.t) > 0.5 ||
        Math.abs(w - drawn.w) > 0.5 ||
        Math.abs(h - drawn.h) > 0.5 ||
        clip !== drawn.clip
      ) {
        drawn = { l, t, w, h, clip };
        el.style.left = `${l}px`;
        el.style.top = `${t}px`;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        el.style.clipPath = clip;
      }
      if (el.style.visibility !== "visible") el.style.visibility = "visible";
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={boxRef}
      className="overflow-hidden rounded-xl bg-black"
      style={{
        position: "fixed",
        zIndex: 12,
        visibility: "hidden",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
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
        className="h-full w-full object-cover"
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
