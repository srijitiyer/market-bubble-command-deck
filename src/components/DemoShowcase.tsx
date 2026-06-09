"use client";

import { useEffect } from "react";
import { useDeck } from "@/lib/store";

// The product film. A chaptered, cinematic walkthrough:
//
//   - The deck is gently inset into a "frame" for the duration of the film,
//     reserving a black band at the bottom of the screen. ALL narration lives
//     there as a fixed lower-third (kicker + serif headline), so text can never
//     overlap content or run off screen.
//   - A soft spotlight glides between large regions; small features are shown
//     by their own interactions (hovercards, typing, clicks), never by
//     shrinking the spotlight onto tiny targets.
//   - Sections (Command Deck, Markets, Leaderboard) are introduced by serif
//     chapter cards on an opaque field; the view switches under the card, so
//     there are no visible swaps or cuts.
//
// Auto-plays on ?tour=1; replay with Shift+S or window.__playShowcase().
// (The older zoom/cursor tour is preserved at ?tour=legacy / Shift+T.)

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const MOVE = 900;
const SCALE = 0.9;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type WinHooks = {
  __tourActive?: boolean;
  __playIntro?: () => void;
  __playOutro?: () => void;
  __playShowcase?: () => void;
  __mbSetLayout?: (l: Record<string, number>) => void;
};
const win = () => window as unknown as Window & WinHooks;

export function DemoShowcase() {
  useEffect(() => {
    let cancelled = false;

    // ---- the frame: inset the whole deck, reserving the lower third --------
    const stage = document.getElementById("deck-stage");
    const frameOn = async () => {
      if (!stage) return;
      stage.style.transition = `transform 1100ms ${EASE}`;
      stage.style.transformOrigin = "50% 0";
      stage.style.transform = `scale(${SCALE})`;
      await sleep(1150);
    };
    const frameOff = () => {
      if (!stage) return;
      stage.style.transform = "";
      stage.style.transformOrigin = "0 0";
    };

    // ---- spotlight (transparent window in a dimming field) -----------------
    const ring =
      "inset 0 0 0 1px rgba(233,225,209,0.38), 0 0 40px rgba(233,225,209,0.1)";
    const spot = document.createElement("div");
    spot.id = "__spot";
    spot.style.cssText =
      "position:fixed;pointer-events:none;z-index:60;border-radius:14px;" +
      "left:50%;top:40%;width:0;height:0;opacity:0;" +
      `box-shadow:0 0 0 5000px rgba(5,5,6,0.55), ${ring};` +
      `transition:left ${MOVE}ms ${EASE},top ${MOVE}ms ${EASE},width ${MOVE}ms ${EASE},height ${MOVE}ms ${EASE},opacity .5s ease;`;
    document.body.appendChild(spot);
    const spotlight = async (el: Element | null, pad = 8, instant = false) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (instant) spot.style.transition = "none";
      spot.style.left = `${r.left - pad}px`;
      spot.style.top = `${r.top - pad}px`;
      spot.style.width = `${r.width + pad * 2}px`;
      spot.style.height = `${r.height + pad * 2}px`;
      if (instant) {
        void spot.offsetWidth;
        spot.style.transition = `left ${MOVE}ms ${EASE},top ${MOVE}ms ${EASE},width ${MOVE}ms ${EASE},height ${MOVE}ms ${EASE},opacity .5s ease`;
      }
      spot.style.opacity = "1";
      await sleep(instant ? 60 : MOVE + 80);
    };
    const spotOff = () => {
      spot.style.opacity = "0";
    };

    // ---- lower-third narration (fixed, in the reserved band) ---------------
    const third = document.createElement("div");
    third.id = "__third";
    third.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:61;pointer-events:none;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      `height:${Math.round((1 - SCALE) * 100)}vh;min-height:64px;padding:0 32px;` +
      "opacity:0;transition:opacity .4s ease;text-align:center;";
    third.innerHTML =
      '<div id="__third_k" style="font:600 10px/1 ui-sans-serif,system-ui;letter-spacing:.3em;text-transform:uppercase;color:#c9a86a;margin-bottom:7px"></div>' +
      '<div id="__third_h" style="font-family:var(--font-serif),Georgia,serif;font-weight:600;font-size:clamp(16px,2.6vh + 4px,24px);line-height:1.2;letter-spacing:-.01em;color:#f2efe8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:92vw"></div>';
    document.body.appendChild(third);
    const say = async (kicker: string, headline: string) => {
      third.style.opacity = "0";
      await sleep(260);
      if (cancelled) return;
      (third.querySelector("#__third_k") as HTMLElement).textContent = kicker;
      (third.querySelector("#__third_h") as HTMLElement).textContent = headline;
      third.style.opacity = "1";
    };
    const hush = () => {
      third.style.opacity = "0";
    };

    // ---- chapter cards (opaque field, serif title) --------------------------
    const card = document.createElement("div");
    card.id = "__chapter";
    card.style.cssText =
      "position:fixed;inset:0;z-index:62;background:#070707;opacity:0;pointer-events:none;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;" +
      "transition:opacity .55s ease;";
    document.body.appendChild(card);
    const chapter = async (numeral: string, title: string, work?: () => void | Promise<void>) => {
      card.innerHTML =
        `<div style="font:600 11px/1 ui-sans-serif,system-ui;letter-spacing:.34em;text-transform:uppercase;color:#c9a86a">${numeral}</div>` +
        '<div style="display:flex;align-items:center;gap:18px">' +
        '<span style="height:1px;width:44px;background:rgba(233,225,209,.3)"></span>' +
        `<span style="font-family:var(--font-serif),Georgia,serif;font-weight:600;font-size:40px;letter-spacing:-.01em;color:#f2efe8">${title}</span>` +
        '<span style="height:1px;width:44px;background:rgba(233,225,209,.3)"></span>' +
        "</div>";
      hush();
      card.style.opacity = "1";
      await sleep(620);
      if (cancelled) return;
      await work?.(); // switch views under the opaque card
      await sleep(1250);
      card.style.opacity = "0";
      await sleep(580);
    };

    // ---- interaction helpers ------------------------------------------------
    const q = (s: string) => document.querySelector(s);
    const hover = (el: Element | null | undefined) =>
      el &&
      ["pointerover", "mouseover", "mouseenter"].forEach((t) =>
        el.dispatchEvent(new MouseEvent(t, { bubbles: true })),
      );
    const unhover = (el: Element | null | undefined) =>
      el &&
      ["mouseout", "mouseleave", "pointerout"].forEach((t) =>
        el.dispatchEvent(new MouseEvent(t, { bubbles: true })),
      );
    const typeInto = async (input: HTMLInputElement, text: string) => {
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
        await sleep(36);
      }
    };

    // ---- the film -----------------------------------------------------------
    const run = async (skipIntro = false) => {
      win().__tourActive = true;
      const d = useDeck.getState();
      d.setSection("live");
      d.setViewMode("stage");
      d.setHostFilter("all");
      if (!d.demoMode) d.toggleDemo();

      if (!skipIntro && win().__playIntro) {
        win().__playIntro!();
        await sleep(3700);
      }
      if (cancelled) return;

      // settle, then frame the deck
      await sleep(400);
      await frameOn();
      if (cancelled) return;

      // ACT I — the live room
      await spotlight(q("#deck-stage"), 0);
      await say("Market Bubble", "Every stream and every chat, on one screen.");
      await sleep(3000);
      if (cancelled) return;

      await spotlight(q('[data-tour="hero"]'));
      await say("The broadcast", "The show plays natively inside the deck.");
      await sleep(2900);
      if (cancelled) return;

      await spotlight(q('[data-tour="chat"]'));
      await say("One feed", "Twitch, Kick and X merged in real time. Every message labeled.");
      await sleep(3600);
      if (cancelled) return;

      await spotlight(q('[data-tour="audience"]'));
      await say("Know the room", "Hover any viewer to see where they watch from.");
      const dots = [
        ...document.querySelectorAll('[data-tour="audience"] a[href]'),
      ].filter((a) => /^[A-Z0-9]$/.test(a.textContent?.trim() || ""));
      const dot = dots[3] || dots[0];
      hover(dot);
      await sleep(3000);
      unhover(dot);
      if (cancelled) return;

      useDeck.getState().broadcast("eyeing $SOL here, this could send 👀");
      await sleep(500);
      await spotlight(q('[data-tour="chat"]'));
      await say("Crypto native", "Cashtags pull live prices straight into chat.");
      const chip = [...document.querySelectorAll('[data-tour="chat"] a')]
        .filter((a) => (a.textContent?.trim() || "")[0] === "$")
        .pop();
      hover(chip);
      await sleep(3200);
      unhover(chip);
      if (cancelled) return;

      await spotlight(q('[data-tour="composer"]'), 10);
      await say("One shared chat", "Type once and the whole room sees it.");
      const composer = q(
        'input[aria-label="Broadcast to the shared chat"]',
      ) as HTMLInputElement | null;
      if (composer) {
        await typeInto(composer, "gm degens, we are SO back");
        await sleep(350);
        composer
          .closest("form")
          ?.querySelector<HTMLButtonElement>('button[type="submit"]')
          ?.click();
      }
      await sleep(1900);
      if (cancelled) return;

      await spotlight(q('[data-tour="row"]'), 4);
      await say("Follow the hosts", "One click filters everything to Ansem or Banks.");
      const hostBtn = (label: string) =>
        [...document.querySelectorAll('[data-tour="hostswitch"] button')].find(
          (b) => b.textContent?.trim() === label,
        ) as HTMLButtonElement | undefined;
      hostBtn("Ansem")?.click();
      await sleep(3000);
      hostBtn("Both")?.click();
      if (cancelled) return;

      await spotlight(q('[data-tour="odds"]'));
      await say("Live odds", "Real Polymarket markets, priced in real time.");
      await sleep(3100);
      if (cancelled) return;

      // ACT II — the command deck (power view)
      await chapter("Chapter II", "The Command Deck", () => {
        useDeck.getState().setViewMode("deck");
      });
      if (cancelled) return;
      await spotlight(q("#deck-stage"), 0, true);
      await say("Built for operators", "A full multi-panel deck. Drag anything to resize.");
      const setL = win().__mbSetLayout;
      if (setL) {
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
        const steps = 22;
        for (let i = 1; i <= steps; i++) {
          if (cancelled) return;
          setL({ left: 17, center: lerp(53, 45, i / steps), right: lerp(30, 38, i / steps) });
          await sleep(30);
        }
        await sleep(420);
        for (let i = 1; i <= steps; i++) {
          if (cancelled) return;
          setL({ left: 17, center: lerp(45, 53, i / steps), right: lerp(38, 30, i / steps) });
          await sleep(30);
        }
      }
      await sleep(900);
      if (cancelled) return;

      // ACT III — markets
      await chapter("Chapter III", "Markets", () => {
        useDeck.getState().setSection("markets");
      });
      if (cancelled) return;
      await spotlight(q('[data-tour="markets"]'), 6, true);
      await say("The tape", "Live prices, sparklines and market caps from CoinGecko.");
      await sleep(3400);
      if (cancelled) return;

      // ACT IV — leaderboard
      await chapter("Chapter IV", "Leaderboard", () => {
        useDeck.getState().setSection("leaders");
      });
      if (cancelled) return;
      await spotlight(q('[data-tour="leaders"]'), 6, true);
      await say("Who moves the room", "A live ranking built from the merged feed.");
      await sleep(3400);
      if (cancelled) return;

      // CLOSE — black, restore everything under cover, then the sign-off
      card.innerHTML = "";
      card.style.opacity = "1";
      await sleep(620);
      spotOff();
      hush();
      frameOff();
      const dd = useDeck.getState();
      dd.setSection("live");
      dd.setViewMode("stage");
      if (win().__playOutro) {
        win().__playOutro!(); // outro's own field is the same opaque #070707
        await sleep(150);
        card.style.opacity = "0";
        await sleep(6200);
      } else {
        card.style.opacity = "0";
      }
      win().__tourActive = false;
    };

    win().__playShowcase = () => {
      cancelled = false;
      void run();
    };
    let auto: ReturnType<typeof setTimeout> | undefined;
    if (/[?&]tour=1\b/.test(window.location.search)) {
      auto = setTimeout(() => void run(true), 4200);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "S" || e.key === "s")) void run();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelled = true;
      if (auto) clearTimeout(auto);
      window.removeEventListener("keydown", onKey);
      spot.remove();
      third.remove();
      card.remove();
      frameOff();
      win().__tourActive = false;
    };
  }, []);

  return null;
}
