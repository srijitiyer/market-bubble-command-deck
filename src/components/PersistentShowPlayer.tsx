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
  const innerRef = useRef<HTMLDivElement>(null);
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
    // Relentless playback: after the user's one tap (first PLAYING event),
    // never accept a pause again. Twitch's viewability logic pauses the embed
    // whenever it judges the iframe insufficiently visible, and the exact
    // threshold varies with viewport — parking handles the cases we predict,
    // this watchdog resurrects playback from the ones we don't.
    // NOTE: this is best-effort only — Twitch VOD play() needs user-gesture
    // activation, so a genuine pause can't be cured from script. The real
    // protection is the parking logic below, which prevents the viewability
    // pause from ever firing. If a pause still slips through, the branded
    // cover reappears and one tap restarts it.
    let everPlayed = false;
    const revive = setInterval(() => {
      try {
        if (ready && everPlayed && player?.isPaused?.()) player.play();
      } catch {
        /* ignore */
      }
    }, 800);
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
      player.addEventListener(Twitch.Player.PLAYING, () => {
        everPlayed = true;
        setCovered(false);
      });
      if (Twitch.Player.PLAY)
        player.addEventListener(Twitch.Player.PLAY, () => setCovered(false));
      player.addEventListener(Twitch.Player.PAUSE, () => setCovered(true));
      player.addEventListener(Twitch.Player.ENDED, () => setCovered(true));
      (window as unknown as { __armShowPlayback?: () => void }).__armShowPlayback = start;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as unknown as { __showPlayer?: any }).__showPlayer = player;
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
      clearInterval(revive);
      delete (window as unknown as { __armShowPlayback?: () => void }).__armShowPlayback;
    };
  }, []);

  // follow the current view's slot every frame (cheap: dirty-checked writes)
  useEffect(() => {
    const el = boxRef.current;
    const inner = innerRef.current;
    const stage = document.getElementById("deck-stage");
    if (!el || !inner || !stage) return;
    let raf = 0;
    let drawn = { l: -1, t: -1, w: -1, h: -1, ix: -1, iy: -1, s: -1 };
    // The player covers ONLY the on-screen-visible part of its slot, and the
    // video FILLS that region (16:9 in a 16:9 tile -> no letterbox bars). The
    // box is position:fixed in true screen coords, so its iframe is ALWAYS
    // fully within the viewport no matter how far a tour beat pans the slot
    // off-screen — and Twitch's viewability pause (which a VOD can't recover
    // from) keys off the iframe's viewport intersection, so it never fires.
    // The iframe itself never resizes (it stays BASE_W×BASE_H and is only
    // transform-scaled), which is the other thing that would pause it.
    const hide = () => {
      if (el.style.visibility !== "hidden") el.style.visibility = "hidden";
      drawn = { l: -1, t: -1, w: -1, h: -1, ix: -1, iy: -1, s: -1 };
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
      // visible region = slot ∩ overflow/scroll ancestors ∩ viewport
      let l = sr.left,
        t = sr.top,
        r = sr.right,
        b = sr.bottom;
      let a = slot.parentElement;
      while (a && a !== document.body) {
        const cs = getComputedStyle(a);
        if (/(auto|scroll|hidden)/.test(cs.overflowY + cs.overflowX)) {
          const ar = a.getBoundingClientRect();
          l = Math.max(l, ar.left);
          t = Math.max(t, ar.top);
          r = Math.min(r, ar.right);
          b = Math.min(b, ar.bottom);
        }
        a = a.parentElement;
      }
      l = Math.max(l, 0);
      t = Math.max(t, 0);
      r = Math.min(r, window.innerWidth);
      b = Math.min(b, window.innerHeight);
      const w = r - l;
      const h = b - t;
      if (w < 80 || h < 45) {
        hide();
        return;
      }
      // the video is scaled to the slot's full on-screen size (so it reads at
      // the beat's zoom level), centered in the visible region, and the region
      // clips the overflow. cover = the slot's current screen scale.
      const cover = Math.max(sr.width / BASE_W, sr.height / BASE_H);
      // center the iframe on the region's center (which is on-screen), NOT on
      // the slot's center (which may be off-screen) — that's what keeps the
      // iframe rect inside the viewport and playback alive.
      const ix = w / 2;
      const iy = h / 2;
      if (
        Math.abs(l - drawn.l) > 0.5 ||
        Math.abs(t - drawn.t) > 0.5 ||
        Math.abs(w - drawn.w) > 0.5 ||
        Math.abs(h - drawn.h) > 0.5 ||
        Math.abs(cover - drawn.s) > 0.001
      ) {
        drawn = { l, t, w, h, ix, iy, s: cover };
        el.style.left = `${l}px`;
        el.style.top = `${t}px`;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        inner.style.left = `${ix}px`;
        inner.style.top = `${iy}px`;
        inner.style.transform = `translate(-50%, -50%) scale(${cover.toFixed(4)})`;
      }
      if (el.style.visibility !== "visible") el.style.visibility = "visible";
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={boxRef}
      className="overflow-hidden rounded-xl"
      style={{
        position: "fixed",
        zIndex: 12,
        visibility: "hidden",
        left: 0,
        top: 0,
        width: BASE_W,
        height: BASE_H,
      }}
    >
      <div
        ref={innerRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: BASE_W,
          height: BASE_H,
          transformOrigin: "center center",
        }}
      >
        <div ref={mountRef} className="h-full w-full bg-black" />
      </div>
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
