"use client";

import { useEffect } from "react";
import { useDeck } from "@/lib/store";

// A self-playing guided tour of the deck, used to record the demo video. Drives
// a synthetic cursor through the key beats so the whole thing can be screen-
// recorded in a normal browser tab with zero external tooling. Trigger with
// ?tour=1 in the URL, by pressing Shift+T, or window.__startTour().

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function caption(text: string, ms: number) {
  let el = document.getElementById("__tour_caption");
  if (!el) {
    el = document.createElement("div");
    el.id = "__tour_caption";
    el.style.cssText =
      "position:fixed;left:50%;bottom:48px;transform:translateX(-50%);z-index:100000;" +
      "padding:10px 18px;border-radius:10px;background:rgba(10,11,15,0.82);" +
      "backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);" +
      "font:600 15px/1 ui-sans-serif,system-ui;color:#ecedf1;letter-spacing:-0.01em;" +
      "opacity:0;transition:opacity .3s ease;box-shadow:0 8px 32px rgba(0,0,0,.5);" +
      "pointer-events:none;white-space:nowrap";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = "1";
  if (ms > 0) setTimeout(() => el && (el.style.opacity = "0"), ms);
}

function makeCursor() {
  document.getElementById("__tour_cursor")?.remove();
  const c = document.createElement("div");
  c.id = "__tour_cursor";
  c.style.cssText =
    "position:fixed;left:0;top:0;width:24px;height:24px;z-index:100001;pointer-events:none;" +
    "transition:transform .6s cubic-bezier(.4,0,.2,1),opacity .3s;transform:translate(50vw,46vh);" +
    "filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))";
  c.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 2 L4 18 L8.5 13.5 L11.5 20 L14 18.8 L11 12.5 L17 12.5 Z" fill="#fff" stroke="#0a0a0a" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  document.body.appendChild(c);
  return c;
}

export function DemoTour() {
  useEffect(() => {
    let cancelled = false;

    const moveTo = (c: HTMLElement, x: number, y: number) => {
      c.style.transform = `translate(${x}px,${y}px)`;
      return sleep(640);
    };
    const moveToEl = async (c: HTMLElement, el: Element | null | undefined) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      await moveTo(c, r.left + r.width / 2 - 7, r.top + r.height / 2 - 5);
    };
    const fire = (el: Element | null | undefined, types: string[]) => {
      if (!el) return;
      types.forEach((t) =>
        el.dispatchEvent(new MouseEvent(t, { bubbles: true })),
      );
    };
    const hover = (el: Element | null | undefined) =>
      fire(el, ["pointerover", "mouseover", "mouseenter", "mousemove"]);
    const unhover = (el: Element | null | undefined) =>
      fire(el, ["mouseout", "mouseleave", "pointerout"]);
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.top > 130 && r.bottom < window.innerHeight - 140 && r.width > 0;
    };

    const run = async () => {
      const deck = useDeck.getState();
      const cursor = makeCursor();

      // BEAT 1 — hero
      caption("Twitch + Kick + X — one live chat", 3200);
      await moveTo(cursor, window.innerWidth * 0.5, window.innerHeight * 0.5);
      await sleep(2600);
      if (cancelled) return;

      // BEAT 2 — hover a live-audience dot → origin card
      caption("Hover any viewer → see their platform", 3400);
      deck.setPaused(true);
      await sleep(250);
      const dot = [...document.querySelectorAll("aside a[href]")].filter((a) =>
        /^[A-Z0-9]$/.test(a.textContent?.trim() || ""),
      )[4];
      if (dot) {
        await moveToEl(cursor, dot);
        hover(dot);
        await sleep(2700);
        unhover(dot);
      }
      deck.setPaused(false);
      await sleep(700);
      if (cancelled) return;

      // BEAT 3 — cashtag price card
      caption("Cashtags → live price, right in chat", 3400);
      deck.setPaused(true);
      await sleep(350);
      const syms = ["SOL", "BTC", "ETH", "WIF", "BONK", "POPCAT", "PEPE", "DOGE"];
      const chip = [...document.querySelectorAll("main a")].find((a) => {
        const t = a.textContent?.trim() || "";
        return t[0] === "$" && syms.includes(t.slice(1)) && visible(a);
      });
      if (chip) {
        await moveToEl(cursor, chip);
        hover(chip);
        await sleep(2800);
      }
      deck.setPaused(false);
      await sleep(700);
      if (cancelled) return;

      // BEAT 4 — one shared chat broadcast
      caption("Type once → one shared chat", 3600);
      const composer = document.querySelector<HTMLInputElement>(
        'input[aria-label="Broadcast to the shared chat"]',
      );
      if (composer) {
        await moveToEl(cursor, composer);
        const text = "gm degens — we are SO back, ape $BUBBLE";
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!;
        composer.focus();
        for (let i = 1; i <= text.length; i++) {
          setter.call(composer, text.slice(0, i));
          composer.dispatchEvent(new Event("input", { bubbles: true }));
          await sleep(38);
        }
        await sleep(250);
        const btn = composer
          .closest("form")
          ?.querySelector<HTMLButtonElement>('button[type="submit"]');
        await moveToEl(cursor, btn);
        btn?.click();
        await sleep(2500);
      }
      if (cancelled) return;

      // BEAT 5 — resize panels
      caption("Resize anything — it's your deck", 3200);
      const sep = document.querySelectorAll("[data-separator]")[1];
      if (sep) await moveToEl(cursor, sep);
      const setL = (
        window as unknown as { __mbSetLayout?: (l: Record<string, number>) => void }
      ).__mbSetLayout;
      if (setL) {
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        for (let i = 1; i <= 16; i++) {
          const t = i / 16;
          setL({ left: 17, center: lerp(53, 38, t), right: lerp(30, 45, t) });
          await sleep(45);
        }
        await sleep(650);
        for (let i = 1; i <= 16; i++) {
          const t = i / 16;
          setL({ left: 17, center: lerp(38, 53, t), right: lerp(45, 30, t) });
          await sleep(45);
        }
      }
      await sleep(800);
      if (cancelled) return;

      // BEAT 6 — command palette
      caption("⌘K to command the whole deck", 3400);
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
      await sleep(900);
      const pal = document.querySelector<HTMLInputElement>(
        'input[placeholder="Type a command…"]',
      );
      if (pal) {
        await moveTo(cursor, window.innerWidth * 0.5, window.innerHeight * 0.32);
        const t2 = "filter";
        const setter2 = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!;
        pal.focus();
        for (let i = 1; i <= t2.length; i++) {
          setter2.call(pal, t2.slice(0, i));
          pal.dispatchEvent(new Event("input", { bubbles: true }));
          await sleep(70);
        }
        await sleep(2000);
      }
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await sleep(600);
      if (cancelled) return;

      // BEAT 7 — final hold
      caption("Market Bubble · every stream, one chat", 4000);
      await moveTo(cursor, window.innerWidth * 0.82, window.innerHeight * 0.5);
      await sleep(2600);
      cursor.style.opacity = "0";
    };

    (
      window as unknown as { __startTour?: () => void }
    ).__startTour = () => {
      cancelled = false;
      void run();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "T" || e.key === "t")) void run();
    };
    window.addEventListener("keydown", onKey);

    // auto-start when ?tour=1
    let auto: ReturnType<typeof setTimeout> | undefined;
    if (typeof window !== "undefined" && /[?&]tour=1\b/.test(window.location.search)) {
      auto = setTimeout(() => void run(), 3500);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      if (auto) clearTimeout(auto);
    };
  }, []);

  return null;
}
