"use client";

import { useEffect } from "react";
import { useDeck } from "@/lib/store";

// The demo film — a cursor-driven cinematic tour. A glowing cursor works the
// real UI (hovers, clicks, types, switches tabs) while caption cards pop beside
// it and the camera glides into whatever it's working on. Full-bleed: no frames,
// no dimming, no overlay chrome — the live product is the whole picture.
//
// Motion grammar (from Screen Studio / Cap's rendering engine):
//   - cursor travel duration scales with distance, easeInOutCubic, slight tilt
//     toward the motion, a 260ms micro-hold before every click
//   - zoom-ins are snappy (950ms, easeOutExpo-ish), zoom-outs are softer and
//     ~12% slower — and the transition is asserted per-move, never global
//   - captions pop with a small overshoot and exit plain and fast
//
// Trigger: Shift+T (or window.__startTour()). No auto-start — a recording is
// one keypress, hands off. Telemetry: window.__filmBeat / window.__filmErr.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const CURSOR_EASE = "cubic-bezier(0.65, 0, 0.35, 1)"; // hand-like accel/decel
const ZOOM_IN_MS = 950;
const ZOOM_OUT_MS = 1080;
const ZOOM_IN_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const ZOOM_OUT_EASE = "cubic-bezier(0.45, 0, 0.15, 1)";
const POP = "cubic-bezier(0.34, 1.56, 0.64, 1)";

type WinHooks = {
  __tourActive?: boolean;
  __startTour?: () => void;
  __playIntro?: () => void;
  __playOutro?: () => void;
  __mbSetLayout?: (l: Record<string, number>) => void;
  __filmBeat?: string;
  __filmErr?: string;
};
const win = () => window as unknown as Window & WinHooks;

export function DemoTour() {
  useEffect(() => {
    let cancelled = false;

    // ---- cursor -------------------------------------------------------------
    const buildCursor = () => {
      document.getElementById("__tcur")?.remove();
      const c = document.createElement("div");
      c.id = "__tcur";
      const sx = window.innerWidth * 0.5;
      const sy = window.innerHeight * 0.46;
      c.style.cssText =
        "position:fixed;left:0;top:0;width:26px;height:26px;z-index:100002;pointer-events:none;" +
        `transform:translate(${sx}px,${sy}px) rotate(0deg) scale(1);opacity:0;transition:opacity .35s;` +
        "filter:drop-shadow(0 0 6px rgba(233,225,209,.55)) drop-shadow(0 2px 3px rgba(0,0,0,.6))";
      c.innerHTML =
        '<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M5 3 L5 20 L9.5 15.2 L12.8 22 L15.6 20.7 L12.3 14 L19 14 Z" fill="#fff" stroke="#0a0a0a" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      c.dataset.x = String(sx);
      c.dataset.y = String(sy);
      document.body.appendChild(c);
      return c;
    };
    let cur: HTMLElement | null = null;
    const cx = () => parseFloat(cur?.dataset.x || "0");
    const cy = () => parseFloat(cur?.dataset.y || "0");
    const setCursor = (x: number, y: number, ms: number, tiltRad = 0, scale = 1) => {
      if (!cur) return;
      cur.style.transition =
        ms > 0 ? `transform ${ms}ms ${CURSOR_EASE}, opacity .35s` : "opacity .35s";
      cur.style.transform = `translate(${x}px,${y}px) rotate(${((tiltRad * 180) / Math.PI).toFixed(1)}deg) scale(${scale})`;
      cur.dataset.x = String(x);
      cur.dataset.y = String(y);
    };
    // distance-based travel: ~350ms for short hops, capped at 1100ms
    const move = async (x: number, y: number) => {
      const dx = x - cx();
      const dy = y - cy();
      const dist = Math.hypot(dx, dy);
      if (dist < 2) return;
      const dur = Math.min(1100, Math.max(320, 200 + 0.55 * dist));
      const tilt = Math.max(-0.15, Math.min(0.15, dx / 900));
      setCursor(x, y, dur, tilt);
      placeCaption(x, y);
      await sleep(dur + 40);
      setCursor(x, y, 180, 0); // settle the tilt
      await sleep(60);
    };
    const moveToEl = async (el: Element | null | undefined) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      await move(r.left + r.width / 2 - 8, r.top + r.height / 2 - 5);
    };
    const ripple = () => {
      const r = document.createElement("div");
      r.style.cssText =
        `position:fixed;left:${cx()}px;top:${cy()}px;width:14px;height:14px;z-index:100001;` +
        "border-radius:999px;border:2px solid rgba(233,225,209,.9);pointer-events:none;" +
        "transform:translate(-2px,-2px) scale(1);opacity:.85;transition:transform .52s ease-out,opacity .52s ease-out";
      document.body.appendChild(r);
      requestAnimationFrame(() => {
        r.style.transform = "translate(-2px,-2px) scale(5)";
        r.style.opacity = "0";
      });
      setTimeout(() => r.remove(), 560);
    };
    // micro-hold, press (cursor dips), ripple, click, release
    const clickEl = async (el: Element | null | undefined) => {
      if (!el) return;
      await moveToEl(el);
      await sleep(260);
      setCursor(cx(), cy(), 110, 0, 0.88);
      ripple();
      await sleep(110);
      (el as HTMLElement).click();
      setCursor(cx(), cy(), 200, 0, 1);
      await sleep(160);
    };

    // ---- camera (CSS transform zoom on the stage) ----------------------------
    const stage = document.getElementById("deck-stage");
    let S = 1,
      TX = 0,
      TY = 0;
    const applyZoom = (ms: number, ease: string) => {
      if (!stage) return;
      stage.style.transition = `transform ${ms}ms ${ease}`;
      stage.style.transformOrigin = "0 0";
      stage.style.transform = `translate(${TX}px,${TY}px) scale(${S})`;
    };
    const zoomTo = async (el: Element | null | undefined, scale = 1.5) => {
      if (!el || !stage) return;
      const r = el.getBoundingClientRect();
      const ux = (r.left + r.width / 2 - TX) / S;
      const uy = (r.top + r.height / 2 - TY) / S;
      S = scale;
      const W = window.innerWidth;
      const H = window.innerHeight;
      // clamp the pan so the stage always covers the viewport (no black edges)
      TX = Math.min(0, Math.max(W - S * W, W / 2 - ux * S));
      TY = Math.min(0, Math.max(H - S * H, H / 2 - uy * S));
      applyZoom(ZOOM_IN_MS, ZOOM_IN_EASE);
      await sleep(ZOOM_IN_MS + 80);
    };
    const zoomReset = async () => {
      if (S === 1 && TX === 0 && TY === 0) return;
      S = 1;
      TX = 0;
      TY = 0;
      applyZoom(ZOOM_OUT_MS, ZOOM_OUT_EASE);
      await sleep(ZOOM_OUT_MS + 80);
    };

    // ---- caption card (pops beside the cursor, travels with it) -------------
    let capEl: HTMLElement | null = null;
    let capBelow = false;
    const placeCaption = (x: number, y: number) => {
      if (!capEl) return;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cw = capEl.offsetWidth || 280;
      const ch = capEl.offsetHeight || 54;
      let left = x + 22;
      let top = capBelow ? y + 30 : y - ch - 16;
      if (left + cw > W - 16) left = x - cw - 18;
      if (left < 16) left = 16;
      if (!capBelow && top < 88) top = y + 30;
      if (capBelow && top + ch > H - 16) top = y - ch - 16;
      capEl.style.left = `${left}px`;
      capEl.style.top = `${top}px`;
    };
    const showCaption = (kicker: string, text: string, below = false) => {
      capBelow = below;
      if (!capEl) {
        capEl = document.createElement("div");
        capEl.id = "__tcap";
        capEl.style.cssText =
          "position:fixed;left:0;top:0;z-index:100003;" +
          "display:flex;align-items:center;gap:11px;padding:11px 17px 11px 13px;border-radius:13px;" +
          "background:linear-gradient(180deg,rgba(24,25,32,.97),rgba(15,16,21,.97));" +
          "border:1px solid rgba(233,225,209,.22);box-shadow:0 14px 44px rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.06);" +
          "opacity:0;transform:translateY(8px) scale(.95);pointer-events:none;backdrop-filter:blur(10px);white-space:nowrap;" +
          `transition:left .8s ${CURSOR_EASE},top .8s ${CURSOR_EASE},opacity .3s ease,transform .32s ${POP}`;
        document.body.appendChild(capEl);
      }
      capEl.innerHTML =
        '<span style="width:3px;height:32px;border-radius:3px;background:linear-gradient(180deg,#e9e1d1,#c9a86a);box-shadow:0 0 10px rgba(233,225,209,.6)"></span>' +
        '<span style="display:flex;flex-direction:column;gap:3px">' +
        `<span style="font:700 9px/1 ui-sans-serif,system-ui;letter-spacing:.16em;text-transform:uppercase;color:#cabba0">${kicker}</span>` +
        `<span style="font:600 16px/1.15 ui-sans-serif,system-ui;letter-spacing:-.01em;color:#f3f4f8">${text}</span>` +
        "</span>";
      const prev = capEl.style.transition;
      capEl.style.transition = "none";
      placeCaption(cx(), cy());
      void capEl.offsetWidth;
      capEl.style.transition = prev;
      requestAnimationFrame(() => {
        if (capEl) {
          capEl.style.opacity = "1";
          capEl.style.transform = "translateY(0) scale(1)";
        }
      });
    };
    const hideCaption = () => {
      if (capEl) {
        capEl.style.transition = "opacity .18s ease, transform .18s ease";
        capEl.style.opacity = "0";
        capEl.style.transform = "translateY(6px) scale(.97)";
      }
    };

    // ---- interaction helpers -------------------------------------------------
    const q = (s: string) => document.querySelector(s);
    const fire = (el: Element | null | undefined, t: string[]) =>
      el && t.forEach((n) => el.dispatchEvent(new MouseEvent(n, { bubbles: true })));
    const hover = (el?: Element | null) =>
      fire(el, ["pointerover", "mouseover", "mouseenter", "mousemove"]);
    const unhover = (el?: Element | null) =>
      fire(el, ["mouseout", "mouseleave", "pointerout"]);
    const typeInto = async (input: HTMLInputElement, text: string, step = 38) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      input.focus();
      for (let i = 1; i <= text.length; i++) {
        if (cancelled) return;
        setter.call(input, text.slice(0, i));
        input.dispatchEvent(new Event("input", { bubbles: true }));
        try {
          input.setSelectionRange(i, i);
          input.scrollLeft = input.scrollWidth;
        } catch {
          /* ignore */
        }
        await sleep(step);
      }
    };
    const bring = async (el: Element | null | undefined) => {
      if (!el) return;
      el.scrollIntoView({ block: "nearest" });
      await sleep(300);
    };
    // keep the show embed actually playing (YouTube pauses idle muted embeds)
    const forcePlay = () => {
      const f = document.getElementById("mb-show-embed") as HTMLIFrameElement | null;
      f?.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', "*");
      f?.contentWindow?.postMessage('{"event":"command","func":"mute","args":""}', "*");
    };
    const waitFor = async (sel: string, tries = 20) => {
      for (let i = 0; i < tries; i++) {
        const el = q(sel);
        if (el) return el;
        await sleep(150);
      }
      return null;
    };

    // ---- the film -------------------------------------------------------------
    const mark = (m: string) => {
      win().__filmBeat = m;
    };
    const run = async () => {
      win().__tourActive = true;
      win().__filmErr = "";
      const deck = useDeck.getState();
      deck.setSection("live");
      deck.setViewMode("stage");
      deck.setHostFilter("all");
      if (!deck.demoMode) deck.toggleDemo();
      forcePlay();

      // INTRO — the cinematic cold-open (glyphs converge into the orb)
      mark("intro");
      if (win().__playIntro) {
        win().__playIntro!();
        await sleep(3750);
      }
      if (cancelled) return;
      cur = buildCursor();
      cur.style.opacity = "1";
      forcePlay();

      // BEAT 1 — hero wide
      mark("hero");
      showCaption("Market Bubble", "Twitch · Kick · X · one live deck");
      await move(window.innerWidth * 0.5, window.innerHeight * 0.52);
      await sleep(2300);
      if (cancelled) return;

      // BEAT 2 — the live vitals (cursor sweeps along the numbers; no zoom —
      // a full-width bar at the top edge can't be framed by a center-zoom)
      mark("stats");
      showCaption("Live vitals", "Viewers, chatters, messages, counted live", true);
      const stats = q('[data-tour="stats"]');
      if (stats) {
        const r = stats.getBoundingClientRect();
        await move(r.left + 30, r.top + r.height * 0.6);
        await sleep(500);
        await move(r.left + Math.min(r.width * 0.42, 560), r.top + r.height * 0.6);
        await sleep(1700);
      }
      if (cancelled) return;

      // BEAT 3 — the broadcast
      mark("broadcast");
      forcePlay();
      showCaption("Watch live", "The show plays right in the deck");
      const hero = q('[data-tour="hero"]');
      if (hero) {
        await zoomTo(hero, 1.35);
        await moveToEl(hero);
        await sleep(2400);
        await zoomReset();
      }
      if (cancelled) return;

      // BEAT 4 — the merged feed
      mark("feed");
      showCaption("One merged feed", "Every chat, live and source-labeled");
      const chat = q('[data-tour="chat"]');
      if (chat) {
        await zoomTo(chat, 1.32);
        await moveToEl(chat);
        await sleep(2700);
        await zoomReset();
      }
      if (cancelled) return;

      // BEAT 5 — hover a viewer → their platform
      mark("audience");
      showCaption("Live audience", "Hover any viewer → see their platform", true);
      const aud = q('[data-tour="audience"]');
      await bring(aud);
      deck.setPaused(true);
      const dots = aud
        ? [...aud.querySelectorAll("a[href]")].filter((a) =>
            /^[A-Z0-9]$/.test(a.textContent?.trim() || ""),
          )
        : [];
      const dot = dots[3] || dots[0];
      if (dot) {
        await zoomTo(dot, 1.45); // center the action, not the container
        await moveToEl(dot);
        hover(dot);
        await sleep(2600);
        unhover(dot);
      }
      await zoomReset();
      deck.setPaused(false);
      await sleep(250);
      if (cancelled) return;

      // BEAT 6 — cashtag → live price
      mark("cashtag");
      showCaption("Crypto-native", "Cashtags → live price, right in chat", true);
      deck.broadcast("eyeing $SOL here, this could send 👀");
      await sleep(550);
      deck.setPaused(true);
      await sleep(250);
      const chip = chat
        ? [...chat.querySelectorAll("a")]
            .filter((a) => (a.textContent?.trim() || "")[0] === "$")
            .pop()
        : null;
      if (chip) {
        await zoomTo(chip, 1.4); // center the action, not the container
        await moveToEl(chip);
        hover(chip);
        await sleep(2700);
        unhover(chip);
      }
      await zoomReset();
      deck.setPaused(false);
      await sleep(250);
      if (cancelled) return;

      // BEAT 7 — one shared chat
      mark("composer");
      showCaption("One shared chat", "Type once → the whole room sees it");
      const composer = q(
        'input[aria-label="Broadcast to the shared chat"]',
      ) as HTMLInputElement | null;
      if (composer) {
        await zoomTo(composer, 1.38); // center the action, not the container
        await moveToEl(composer);
        await typeInto(composer, "gm degens, we are SO back");
        await sleep(300);
        const send = composer
          .closest("form")
          ?.querySelector<HTMLButtonElement>('button[type="submit"]');
        await clickEl(send);
        await sleep(1500); // watch it land in the room
        await zoomReset();
      }
      if (cancelled) return;

      // BEAT 8 — follow the hosts (no zoom: switch + refilter both visible)
      mark("hosts");
      showCaption("Follow the hosts", "One click filters the room to a host");
      const hostBtn = (label: string) =>
        [...document.querySelectorAll('[data-tour="hostswitch"] button')].find(
          (b) => b.textContent?.trim() === label,
        );
      await clickEl(hostBtn("Ansem"));
      await sleep(2300);
      await clickEl(hostBtn("Both"));
      if (cancelled) return;

      // BEAT 9 — live Polymarket odds
      mark("odds");
      showCaption("Live odds · Polymarket", "Real markets on every take");
      const odds = q('[data-tour="odds"]');
      await bring(odds);
      if (odds) {
        await zoomTo(odds, 1.4);
        await moveToEl(odds);
        await sleep(2500);
        await zoomReset();
      }
      if (cancelled) return;

      // BEAT 10 — the command deck (cursor flips the real toggle, then resizes)
      mark("deckview");
      showCaption("Command deck", "Resize anything · built for operators");
      await clickEl(q('[data-tour="toggle-deck"]'));
      const sep = await waitFor("[data-separator]");
      const seps = document.querySelectorAll("[data-separator]");
      const handle = seps[1] || sep;
      const setL = win().__mbSetLayout;
      if (handle && setL) {
        setL({ left: 17, center: 53, right: 30 }); // canonical start
        await sleep(350);
        await moveToEl(handle);
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        cur!.style.transition = "opacity .35s"; // cursor tracks the handle live
        const track = () => {
          const r = handle.getBoundingClientRect();
          setCursor(r.left + r.width / 2 - 8, r.top + r.height / 2 - 5, 0);
        };
        const steps = 22;
        for (let i = 1; i <= steps; i++) {
          if (cancelled) return;
          setL({ left: 17, center: lerp(53, 45, i / steps), right: lerp(30, 38, i / steps) });
          track();
          await sleep(32);
        }
        await sleep(420);
        for (let i = 1; i <= steps; i++) {
          if (cancelled) return;
          setL({ left: 17, center: lerp(45, 53, i / steps), right: lerp(38, 30, i / steps) });
          track();
          await sleep(32);
        }
      }
      await sleep(800);
      if (cancelled) return;

      // BEAT 11 — Markets (the cursor uses the real nav)
      mark("markets");
      hideCaption();
      await clickEl(q('[data-tour="nav-markets"]'));
      await waitFor('[data-tour="markets"]');
      await sleep(700); // let live prices land
      showCaption("Markets", "Live prices straight from the tape");
      const markets = q('[data-tour="markets"]');
      if (markets) {
        await zoomTo(markets, 1.22);
        await moveToEl(markets);
        await sleep(2600);
        await zoomReset();
      }
      if (cancelled) return;

      // BEAT 12 — Leaderboard
      mark("leaders");
      hideCaption();
      await clickEl(q('[data-tour="nav-leaders"]'));
      await waitFor('[data-tour="leaders"]');
      await sleep(500);
      showCaption("Leaderboard", "Who moves the room, ranked live");
      const leaders = q('[data-tour="leaders"]');
      if (leaders) {
        await zoomTo(leaders, 1.22);
        await moveToEl(leaders);
        await sleep(2600);
        await zoomReset();
      }
      if (cancelled) return;

      // BEAT 13 — back home, sign-off
      mark("home");
      hideCaption();
      await clickEl(q('[data-tour="nav-live"]'));
      await sleep(400);
      await clickEl(q('[data-tour="toggle-stage"]'));
      forcePlay();
      await sleep(600);
      showCaption("Market Bubble", "Every stream. One chat.");
      await move(window.innerWidth * 0.5, window.innerHeight * 0.5);
      await sleep(1900);
      hideCaption();
      if (cur) cur.style.opacity = "0";
      await sleep(350);

      // OUTRO — the cinematic sign-off (orb + wordmark lockup)
      mark("outro");
      if (win().__playOutro) {
        win().__playOutro!();
        await sleep(6300);
      }
      mark("done");
      win().__tourActive = false;
    };
    const safeRun = async () => {
      try {
        await run();
      } catch (e) {
        win().__filmErr = String((e as Error)?.stack || e);
        win().__tourActive = false;
      }
    };

    win().__startTour = () => {
      cancelled = false;
      void safeRun();
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing) return;
      if (e.shiftKey && (e.key === "T" || e.key === "t")) {
        cancelled = false; // a stale flag must never silently kill the film
        void safeRun();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      document.getElementById("__tcur")?.remove();
      document.getElementById("__tcap")?.remove();
      if (stage) {
        stage.style.transform = "";
        stage.style.transition = "";
        stage.style.transformOrigin = "0 0";
      }
      delete win().__startTour;
      win().__tourActive = false;
    };
  }, []);

  return null;
}
