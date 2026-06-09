"use client";

import { useEffect } from "react";
import { useDeck } from "@/lib/store";

// A self-playing cinematic tour of the deck for recording the demo video.
// Drives a glowing cursor, auto-zooms into each beat (Screen-Studio style),
// and shows styled caption cards. Trigger with ?tour=1, Shift+T, or
// window.__startTour().

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Smooth ease-in-out so the cursor accelerates and settles gently (not "sharp").
const EASE = "cubic-bezier(0.45, 0, 0.25, 1)";
const CUR_MS = 780;
const ZOOM_MS = 980;

export function DemoTour() {
  useEffect(() => {
    let cancelled = false;

    // ---- cursor -----------------------------------------------------------
    const buildCursor = () => {
      document.getElementById("__tcur")?.remove();
      const c = document.createElement("div");
      c.id = "__tcur";
      const sx = window.innerWidth * 0.5;
      const sy = window.innerHeight * 0.46;
      c.style.cssText =
        "position:fixed;left:0;top:0;width:26px;height:26px;z-index:100002;pointer-events:none;" +
        `transition:transform ${CUR_MS}ms ${EASE},opacity .35s;transform:translate(${sx}px,${sy}px);` +
        "filter:drop-shadow(0 0 6px rgba(233,225,209,.55)) drop-shadow(0 2px 3px rgba(0,0,0,.6))";
      c.innerHTML =
        '<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M5 3 L5 20 L9.5 15.2 L12.8 22 L15.6 20.7 L12.3 14 L19 14 Z" fill="#fff" stroke="#0a0a0a" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      c.dataset.x = String(sx);
      c.dataset.y = String(sy);
      document.body.appendChild(c);
      return c;
    };
    let cur: HTMLElement;
    const cx = () => parseFloat(cur.dataset.x || "0");
    const cy = () => parseFloat(cur.dataset.y || "0");
    const move = (x: number, y: number) => {
      cur.dataset.x = String(x);
      cur.dataset.y = String(y);
      cur.style.transform = `translate(${x}px,${y}px)`;
      placeCaption(x, y);
      return sleep(CUR_MS + 40);
    };
    const ripple = () => {
      const r = document.createElement("div");
      r.style.cssText =
        `position:fixed;left:${cx()}px;top:${cy()}px;width:14px;height:14px;z-index:100001;` +
        "border-radius:999px;border:2px solid rgba(233,225,209,.9);pointer-events:none;" +
        "transform:translate(-2px,-2px) scale(1);opacity:.9;transition:transform .5s ease-out,opacity .5s ease-out";
      document.body.appendChild(r);
      requestAnimationFrame(() => {
        r.style.transform = "translate(-2px,-2px) scale(4)";
        r.style.opacity = "0";
      });
      setTimeout(() => r.remove(), 520);
    };

    // ---- zoom stage -------------------------------------------------------
    const stage = document.getElementById("deck-stage");
    let S = 1,
      TX = 0,
      TY = 0;
    if (stage) stage.style.transition = `transform ${ZOOM_MS}ms ${EASE}`;
    const applyZoom = () => {
      if (stage) stage.style.transform = `translate(${TX}px,${TY}px) scale(${S})`;
    };
    const zoomTo = async (el: Element | null | undefined, scale = 1.6) => {
      if (!el || !stage) return;
      const r = el.getBoundingClientRect();
      // element center in *untransformed* stage space
      const ux = (r.left + r.width / 2 - TX) / S;
      const uy = (r.top + r.height / 2 - TY) / S;
      S = scale;
      TX = window.innerWidth / 2 - ux * S;
      TY = window.innerHeight / 2 - uy * S;
      applyZoom();
      await sleep(ZOOM_MS + 60);
    };
    const zoomReset = async () => {
      S = 1;
      TX = 0;
      TY = 0;
      applyZoom();
      await sleep(ZOOM_MS + 60);
    };
    const moveToEl = async (el: Element | null | undefined) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      await move(r.left + r.width / 2 - 8, r.top + r.height / 2 - 5);
    };

    // ---- caption card (pops up next to the cursor and travels with it) ----
    const POP = "cubic-bezier(0.34, 1.56, 0.64, 1)"; // slight overshoot = "pop"
    let capEl: HTMLElement | null = null;
    // Anchor the card just above-right of the cursor tip, flipping/clamping so
    // it always stays fully on-screen near the action.
    const placeCaption = (x: number, y: number) => {
      if (!capEl) return;
      const cw = capEl.offsetWidth || 280;
      const ch = capEl.offsetHeight || 54;
      let left = x + 22;
      let top = y - ch - 16;
      if (left + cw > window.innerWidth - 16) left = x - cw - 18;
      if (left < 16) left = 16;
      if (top < 88) top = y + 30;
      capEl.style.left = `${left}px`;
      capEl.style.top = `${top}px`;
    };
    const showCaption = (kicker: string, text: string) => {
      if (!capEl) {
        capEl = document.createElement("div");
        capEl.id = "__tcap";
        capEl.style.cssText =
          "position:fixed;left:0;top:0;z-index:100003;" +
          "display:flex;align-items:center;gap:11px;padding:11px 17px 11px 13px;border-radius:13px;" +
          "background:linear-gradient(180deg,rgba(24,25,32,.97),rgba(15,16,21,.97));" +
          "border:1px solid rgba(233,225,209,.22);box-shadow:0 14px 44px rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.06);" +
          "opacity:0;transform:translateY(8px) scale(.94);pointer-events:none;backdrop-filter:blur(10px);white-space:nowrap;" +
          `transition:left .8s ${EASE},top .8s ${EASE},opacity .3s ease,transform .42s ${POP}`;
        document.body.appendChild(capEl);
      }
      capEl.innerHTML =
        '<span style="width:3px;height:32px;border-radius:3px;background:linear-gradient(180deg,#e9e1d1,#c9a86a);box-shadow:0 0 10px rgba(233,225,209,.6)"></span>' +
        '<span style="display:flex;flex-direction:column;gap:3px">' +
        `<span style="font:700 9px/1 ui-sans-serif,system-ui;letter-spacing:.16em;text-transform:uppercase;color:#c4b6f5">${kicker}</span>` +
        `<span style="font:600 16px/1.15 ui-sans-serif,system-ui;letter-spacing:-.01em;color:#f3f4f8">${text}</span>` +
        "</span>";
      // place at the cursor without gliding (it's still invisible), then pop in
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
        capEl.style.opacity = "0";
        capEl.style.transform = "translateY(8px) scale(.94)";
      }
    };

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
        await sleep(step);
      }
    };

    // ---- choreography -----------------------------------------------------
    const run = async (skipIntro = false) => {
      if (!stage) return;
      const deck = useDeck.getState();

      // Make sure we open on the broadcast Stage with live traffic flowing.
      deck.setViewMode("stage");
      if (!deck.demoMode) deck.toggleDemo();

      // INTRO — replay the cinematic cold-open so it's part of every recording.
      // On ?tour=1 the page-load intro already played, so we skip the replay.
      if (!skipIntro) {
        const playIntro = (window as unknown as { __playIntro?: () => void })
          .__playIntro;
        if (playIntro) {
          playIntro();
          await sleep(3600);
        }
        if (cancelled) return;
      }
      cur = buildCursor();

      const q = (s: string) => document.querySelector<HTMLElement>(s);
      const bring = async (el: Element | null | undefined) => {
        if (!el) return;
        el.scrollIntoView({ block: "center" });
        await sleep(420);
      };

      // BEAT 1 — hero wide
      showCaption("Market Bubble", "Twitch · Kick · X — one live deck");
      await move(window.innerWidth * 0.5, window.innerHeight * 0.5);
      await sleep(2200);
      if (cancelled) return;

      // BEAT 2 — the live broadcast, native in the deck
      showCaption("Watch live", "The show, playing right in the deck");
      const hero = q('[data-tour="hero"]');
      if (hero) {
        await zoomTo(hero, 1.35);
        await moveToEl(hero);
        await sleep(2300);
        await zoomReset();
      }
      await sleep(200);
      if (cancelled) return;

      // BEAT 3 — the merged real-time feed (our edge: actually live, labeled)
      showCaption("One merged feed", "Every chat, live and source-labeled");
      const chat = q('[data-tour="chat"]');
      if (chat) {
        await zoomTo(chat, 1.32);
        await moveToEl(chat);
        await sleep(2600);
        await zoomReset();
      }
      await sleep(200);
      if (cancelled) return;

      // BEAT 4 — hover a viewer → see their platform (the C-suite ask)
      showCaption("Live audience", "Hover any viewer → see their platform");
      const aud = q('[data-tour="audience"]');
      await bring(aud);
      deck.setPaused(true);
      const dot = aud
        ? [...aud.querySelectorAll("a[href]")].find((a) =>
            /^[A-Z0-9]$/.test(a.textContent?.trim() || ""),
          )
        : null;
      if (dot) {
        await zoomTo(dot, 2);
        await moveToEl(dot);
        hover(dot);
        await sleep(2500);
        unhover(dot);
      }
      await zoomReset();
      deck.setPaused(false);
      await sleep(250);
      if (cancelled) return;

      // BEAT 5 — cashtag → live price card
      showCaption("Crypto-native", "Cashtags → live price, right in chat");
      deck.broadcast("eyeing $SOL here, this could send 👀");
      await sleep(450);
      deck.setPaused(true);
      await sleep(250);
      const chip = chat
        ? [...chat.querySelectorAll("a")]
            .filter((a) => (a.textContent?.trim() || "")[0] === "$")
            .pop()
        : null;
      if (chip) {
        await zoomTo(chip, 2.1);
        await moveToEl(chip);
        hover(chip);
        await sleep(2600);
      }
      await zoomReset();
      deck.setPaused(false);
      await sleep(250);
      if (cancelled) return;

      // BEAT 6 — host switch (Ansem / Banks)
      showCaption("Filter by host", "Follow Ansem or Banks across every platform");
      const hs = q('[data-tour="hostswitch"]');
      if (hs) {
        await zoomTo(hs, 1.9);
        const ansem = [...hs.querySelectorAll("button")].find(
          (b) => b.textContent?.trim() === "Ansem",
        );
        if (ansem) {
          await moveToEl(ansem);
          ripple();
          ansem.click();
          await sleep(2000);
        }
        [...hs.querySelectorAll("button")]
          .find((b) => b.textContent?.trim() === "Both")
          ?.click();
        await zoomReset();
      }
      await sleep(250);
      if (cancelled) return;

      // BEAT 7 — live Polymarket odds (on-brand differentiator)
      showCaption("Live odds · Polymarket", "Markets on every take they make");
      const odds = q('[data-tour="odds"]');
      await bring(odds);
      if (odds) {
        await zoomTo(odds, 1.7);
        await moveToEl(odds);
        await sleep(2500);
        await zoomReset();
      }
      await sleep(200);
      if (cancelled) return;

      // BEAT 8 — one shared chat (the kill-shot)
      showCaption("The kill-shot", "Type once → one shared chat");
      const composer = q(
        'input[aria-label="Broadcast to the shared chat"]',
      ) as HTMLInputElement | null;
      if (composer) {
        await zoomTo(composer, 1.7);
        await moveToEl(composer);
        await typeInto(composer, "gm degens — we are SO back, ape $BUBBLE");
        await sleep(200);
        const btn = composer
          .closest("form")
          ?.querySelector<HTMLButtonElement>('button[type="submit"]');
        await moveToEl(btn);
        ripple();
        btn?.click();
        await sleep(1500);
        await zoomReset();
        await sleep(700);
      }
      if (cancelled) return;

      // BEAT 9 — reveal the full power-user Deck (+ a resize flourish)
      showCaption("Command deck", "Or go full command deck — resize anything");
      deck.setViewMode("deck");
      await sleep(900); // let the panel group mount
      const setL = (
        window as unknown as { __mbSetLayout?: (l: Record<string, number>) => void }
      ).__mbSetLayout;
      const sep = document.querySelectorAll("[data-separator]")[1];
      if (setL && sep) {
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        cur.style.transition = "none";
        const track = () => {
          const r = sep.getBoundingClientRect();
          const hx = r.left + r.width / 2 - 8;
          const hy = r.top + r.height / 2 - 5;
          cur.style.transform = `translate(${hx}px,${hy}px)`;
          cur.dataset.x = String(hx);
          cur.dataset.y = String(hy);
          placeCaption(hx, hy);
        };
        const steps = 24;
        for (let i = 1; i <= steps; i++) {
          if (cancelled) return;
          setL({ left: 17, center: lerp(53, 45, i / steps), right: lerp(30, 38, i / steps) });
          track();
          await sleep(34);
        }
        await sleep(450);
        for (let i = 1; i <= steps; i++) {
          if (cancelled) return;
          setL({ left: 17, center: lerp(45, 53, i / steps), right: lerp(38, 30, i / steps) });
          track();
          await sleep(34);
        }
        cur.style.transition = `transform ${CUR_MS}ms ${EASE}`;
      }
      await sleep(500);
      deck.setViewMode("stage"); // back to the hero for the sign-off
      await sleep(700);
      if (cancelled) return;

      // FINAL — sign-off, then the cinematic outro
      showCaption("Market Bubble", "Every stream. One chat.");
      await move(window.innerWidth * 0.5, window.innerHeight * 0.5);
      await sleep(1500);
      hideCaption();
      cur.style.opacity = "0";
      await sleep(350);

      // OUTRO — cinematic bookend (orb + wordmark + glyph row)
      const playOutro = (window as unknown as { __playOutro?: () => void })
        .__playOutro;
      if (playOutro) {
        playOutro();
        await sleep(4900);
      }
    };

    (window as unknown as { __startTour?: () => void }).__startTour = () => {
      cancelled = false;
      void run();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "T" || e.key === "t")) void run();
    };
    window.addEventListener("keydown", onKey);

    let auto: ReturnType<typeof setTimeout> | undefined;
    if (typeof window !== "undefined" && /[?&]tour=1\b/.test(window.location.search)) {
      // page-load intro plays first (~3.3s); start beats just after it fades
      auto = setTimeout(() => void run(true), 4000);
    }
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      if (auto) clearTimeout(auto);
      if (stage) stage.style.transform = "";
    };
  }, []);

  return null;
}
