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
      c.style.cssText =
        "position:fixed;left:0;top:0;width:26px;height:26px;z-index:100002;pointer-events:none;" +
        `transition:transform ${CUR_MS}ms ${EASE},opacity .35s;transform:translate(50vw,46vh);` +
        "filter:drop-shadow(0 0 6px rgba(184,139,255,.55)) drop-shadow(0 2px 3px rgba(0,0,0,.6))";
      c.innerHTML =
        '<svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M5 3 L5 20 L9.5 15.2 L12.8 22 L15.6 20.7 L12.3 14 L19 14 Z" fill="#fff" stroke="#0a0a0a" stroke-width="1.4" stroke-linejoin="round"/></svg>';
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
      return sleep(CUR_MS + 40);
    };
    const ripple = () => {
      const r = document.createElement("div");
      r.style.cssText =
        `position:fixed;left:${cx()}px;top:${cy()}px;width:14px;height:14px;z-index:100001;` +
        "border-radius:999px;border:2px solid rgba(184,139,255,.9);pointer-events:none;" +
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

    // ---- caption card -----------------------------------------------------
    let capEl: HTMLElement | null = null;
    const showCaption = (kicker: string, text: string) => {
      if (!capEl) {
        capEl = document.createElement("div");
        capEl.id = "__tcap";
        capEl.style.cssText =
          "position:fixed;left:50%;bottom:42px;transform:translate(-50%,16px);z-index:100003;" +
          "display:flex;align-items:center;gap:12px;padding:12px 18px 12px 14px;border-radius:14px;" +
          "background:linear-gradient(180deg,rgba(22,23,29,.96),rgba(14,15,20,.96));" +
          "border:1px solid rgba(255,255,255,.1);box-shadow:0 12px 40px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.05);" +
          "opacity:0;transition:opacity .4s ease,transform .4s " + EASE + ";pointer-events:none;backdrop-filter:blur(10px)";
        document.body.appendChild(capEl);
      }
      capEl.innerHTML =
        '<span style="width:3px;height:30px;border-radius:3px;background:linear-gradient(180deg,#b88bff,#8aa0ff)"></span>' +
        '<span style="display:flex;flex-direction:column;gap:3px">' +
        `<span style="font:600 9px/1 ui-sans-serif,system-ui;letter-spacing:.14em;text-transform:uppercase;color:#b88bff">${kicker}</span>` +
        `<span style="font:600 16px/1.1 ui-sans-serif,system-ui;letter-spacing:-.01em;color:#ecedf1;white-space:nowrap">${text}</span>` +
        "</span>";
      requestAnimationFrame(() => {
        if (capEl) {
          capEl.style.opacity = "1";
          capEl.style.transform = "translate(-50%,0)";
        }
      });
    };
    const hideCaption = () => {
      if (capEl) {
        capEl.style.opacity = "0";
        capEl.style.transform = "translate(-50%,16px)";
      }
    };

    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.top > 130 && r.bottom < window.innerHeight - 150 && r.width > 0;
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
    const run = async () => {
      if (!stage) return;
      const deck = useDeck.getState();
      cur = buildCursor();

      // BEAT 1 — hero
      showCaption("Market Bubble", "Twitch + Kick + X — one live chat");
      await move(window.innerWidth * 0.5, window.innerHeight * 0.52);
      await sleep(2600);
      if (cancelled) return;

      // BEAT 2 — audience origin card (zoom into the live-audience strip)
      showCaption("Live audience", "Hover any viewer → see their platform");
      deck.setPaused(true);
      await sleep(200);
      const dot = [...document.querySelectorAll("aside a[href]")].filter((a) =>
        /^[A-Z0-9]$/.test(a.textContent?.trim() || ""),
      )[4];
      if (dot) {
        await zoomTo(dot, 1.9);
        await moveToEl(dot);
        hover(dot);
        await sleep(2700);
        unhover(dot);
      }
      await zoomReset();
      deck.setPaused(false);
      await sleep(400);
      if (cancelled) return;

      // BEAT 3 — cashtag price card (broadcast a $SOL line so a chip is
      // guaranteed present, then zoom to it)
      showCaption("Crypto-native", "Cashtags → live price, right in chat");
      deck.broadcast("eyeing $SOL here, this could send 👀");
      await sleep(450);
      deck.setPaused(true);
      await sleep(250);
      const chips = [...document.querySelectorAll("main a")].filter(
        (a) => (a.textContent?.trim() || "")[0] === "$",
      );
      const chip = chips[chips.length - 1];
      if (chip) {
        await zoomTo(chip, 2);
        await moveToEl(chip);
        hover(chip);
        await sleep(2800);
      }
      await zoomReset();
      deck.setPaused(false);
      await sleep(400);
      if (cancelled) return;

      // BEAT 4 — one shared chat broadcast
      showCaption("The kill-shot", "Type once → one shared chat");
      const composer = document.querySelector<HTMLInputElement>(
        'input[aria-label="Broadcast to the shared chat"]',
      );
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
        await sleep(1600);
        await zoomReset();
        await sleep(900);
      }
      if (cancelled) return;

      // BEAT 5 — resize panels
      showCaption("Your layout", "Resize anything — drag to taste");
      const sep = document.querySelectorAll("[data-separator]")[1];
      if (sep) await moveToEl(sep);
      const setL = (
        window as unknown as { __mbSetLayout?: (l: Record<string, number>) => void }
      ).__mbSetLayout;
      if (setL) {
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        // cursor tracks the handle instantly (handle itself moves smoothly)
        cur.style.transition = "none";
        const track = () => {
          if (!sep) return;
          const r = sep.getBoundingClientRect();
          cur.style.transform = `translate(${r.left + r.width / 2 - 8}px,${r.top + r.height / 2 - 5}px)`;
        };
        const steps = 26;
        for (let i = 1; i <= steps; i++) {
          if (cancelled) return;
          const t = i / steps;
          setL({ left: 17, center: lerp(53, 37, t), right: lerp(30, 46, t) });
          track();
          await sleep(34);
        }
        await sleep(550);
        for (let i = 1; i <= steps; i++) {
          if (cancelled) return;
          const t = i / steps;
          setL({ left: 17, center: lerp(37, 53, t), right: lerp(46, 30, t) });
          track();
          await sleep(34);
        }
        cur.style.transition = `transform ${CUR_MS}ms ${EASE}`;
      }
      await sleep(700);
      if (cancelled) return;

      // BEAT 6 — command palette (no zoom — it's a fixed modal)
      showCaption("Command deck", "⌘K — drive the whole thing");
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
      await sleep(850);
      const pal = document.querySelector<HTMLInputElement>(
        'input[placeholder="Type a command…"]',
      );
      if (pal) {
        await move(window.innerWidth * 0.5, window.innerHeight * 0.33);
        await typeInto(pal, "filter", 75);
        await sleep(1900);
      }
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await sleep(600);
      if (cancelled) return;

      // BEAT 7 — final hold
      showCaption("Market Bubble", "Every stream. One chat.");
      await move(window.innerWidth * 0.82, window.innerHeight * 0.5);
      await sleep(3200);
      hideCaption();
      cur.style.opacity = "0";
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
      auto = setTimeout(() => void run(), 4200);
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
