"use client";

import { useEffect, useRef, useState } from "react";

// The demo broadcast player as a SINGLETON that never unmounts. View switches
// (Stage <-> Deck <-> sections) remount their video *tiles*, and a remounted
// Twitch player loses playback until a fresh user gesture — so instead the
// tiles render an empty [data-show-slot] and this floating player follows the
// slot's rect every frame. One tap starts playback once, and it survives the
// whole demo film. Lives inside #deck-stage so the tour's zoom transform
// carries it; clips against scrollable ancestors so it never bleeds over
// other panels while a column scrolls.
const DEMO_VOD_ID = "2788673017"; // fazebanks — Market Bubble broadcast
const DEMO_VOD_START = "14m00s";
// Fixed internal player size: Twitch PAUSES when its iframe is resized below
// its 400x300 minimum (the Deck tile is smaller), so the iframe never resizes —
// the whole box CSS-scales to fit the slot instead.
const BASE_W = 880;
const BASE_H = 495;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwitchGlobal = { Player: any };

export function PersistentShowPlayer() {
  const boxRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [covered, setCovered] = useState(true);

  // create the player exactly once
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const host = window.location.hostname;
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
    // Uncover on any sign of life (PLAYING event or an advancing playhead);
    // cover ONLY on explicit pause/end. A stalled playhead must NOT re-cover —
    // buffering and Twitch's pre-roll ads stall it while playback is actually
    // underway, and flashing the card over them reads as 'stuck'.
    let lastT = -1;
    const watch = setInterval(() => {
      try {
        if (!ready || !player || typeof player.getCurrentTime !== "function") return;
        const t = player.getCurrentTime();
        if (typeof t === "number") {
          if (t > lastT + 0.1) setCovered(false);
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
      if (Twitch.Player.PLAY)
        player.addEventListener(Twitch.Player.PLAY, () => setCovered(false));
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
    return () => {
      cancelled = true;
      clearInterval(watch);
      delete (window as unknown as { __armShowPlayback?: () => void }).__armShowPlayback;
    };
  }, []);

  // follow the current view's slot every frame (cheap: dirty-checked writes)
  useEffect(() => {
    const el = boxRef.current;
    const stage = document.getElementById("deck-stage");
    if (!el || !stage) return;
    let raf = 0;
    let drawn = { x: -1, y: -1, w: -1, h: -1, clip: "" };
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const slot = document.querySelector("[data-show-slot]");
      if (!slot) {
        if (el.style.visibility !== "hidden") el.style.visibility = "hidden";
        return;
      }
      const sr = slot.getBoundingClientRect();
      const st = stage.getBoundingClientRect();
      const scale = st.width / (stage as HTMLElement).offsetWidth || 1;
      const x = (sr.left - st.left) / scale;
      const y = (sr.top - st.top) / scale;
      const w = sr.width / scale;
      const h = sr.height / scale;
      const sx = w / BASE_W;
      const sy = h / BASE_H;
      // clip to scrollable/overflow-hidden ancestors so a scrolled column
      // doesn't let the video bleed over other panels
      let cl = sr.left,
        ct = sr.top,
        cr = sr.right,
        cb = sr.bottom;
      let a = slot.parentElement;
      while (a && a !== stage) {
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
      // clip in the box's PRE-transform coordinate space (divide by sx/sy)
      const it = Math.max(0, ct - sr.top) / scale / sy;
      const il = Math.max(0, cl - sr.left) / scale / sx;
      const ib = Math.max(0, sr.bottom - cb) / scale / sy;
      const ir = Math.max(0, sr.right - cr) / scale / sx;
      const round = 12 / Math.max(0.05, sx);
      const clip = `inset(${it.toFixed(1)}px ${ir.toFixed(1)}px ${ib.toFixed(1)}px ${il.toFixed(1)}px round ${round.toFixed(1)}px)`;
      if (
        Math.abs(x - drawn.x) > 0.5 ||
        Math.abs(y - drawn.y) > 0.5 ||
        Math.abs(w - drawn.w) > 0.5 ||
        Math.abs(h - drawn.h) > 0.5 ||
        clip !== drawn.clip
      ) {
        drawn = { x, y, w, h, clip };
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.transform = `scale(${(sx || 0.001).toFixed(4)}, ${(sy || 0.001).toFixed(4)})`;
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
      className="absolute"
      style={{
        zIndex: 12,
        visibility: "hidden",
        left: 0,
        top: 0,
        width: BASE_W,
        height: BASE_H,
        transformOrigin: "0 0",
      }}
    >
      <div ref={mountRef} className="h-full w-full overflow-hidden rounded-xl bg-black" />
      {covered && (
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl"
          style={{
            background: "radial-gradient(80% 70% at 50% 40%, #141210, #0a0a09 75%)",
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
