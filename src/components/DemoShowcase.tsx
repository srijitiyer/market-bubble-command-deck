"use client";

import { useEffect } from "react";
import { useDeck } from "@/lib/store";

// The product film, v3 — a keynote-style piece. No spotlight boxes, no dimming
// windows, no overlays on the product, ever:
//
//   - The deck sits full-bright, gently inset in a frame that reserves a black
//     band at the bottom of the screen. ALL narration lives there as a fixed
//     lower-third (gold kicker + serif headline).
//   - Attention is directed by the product itself: the hovercards popping, the
//     typing, the feed refiltering, the sections switching.
//   - Full-screen serif chapter cards cut between acts; views switch under the
//     opaque card, so there are no visible swaps.
//   - The show embed is driven through YouTube's iframe API (force-play), so
//     the hero is actually playing instead of showing a pause wall.
//
// Runs on Shift+T (or window.__playShowcase()) — no auto-start, so a recording
// is one keypress and hands off. The old zoom tour stays at ?tour=legacy
// (Shift+L). Telemetry: window.__filmBeat / window.__filmErr.

const SCALE = 0.9;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type WinHooks = {
  __tourActive?: boolean;
  __playShowcase?: () => void;
  __mbSetLayout?: (l: Record<string, number>) => void;
  __filmBeat?: string;
  __filmErr?: string;
};
const win = () => window as unknown as Window & WinHooks;

export function DemoShowcase() {
  useEffect(() => {
    let cancelled = false;

    // ---- the frame: inset the deck, reserving the lower third ---------------
    const stage = document.getElementById("deck-stage");
    const frameOn = () => {
      if (!stage) return;
      stage.style.transition = "none";
      stage.style.transformOrigin = "50% 0";
      stage.style.transform = `scale(${SCALE})`;
    };
    const frameOff = () => {
      if (!stage) return;
      stage.style.transform = "";
      stage.style.transformOrigin = "0 0";
    };

    // ---- lower-third narration (fixed, centered in the reserved band) ------
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

    // ---- full-screen cards (chapters + bookends) ----------------------------
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
    const lockupCard = (tagline: string) => {
      card.innerHTML =
        '<div style="width:84px;height:84px;border-radius:50%;margin-bottom:6px;' +
        "background:radial-gradient(circle at 38% 30%, #fefdfb, #ece3d0 34%, #bcab86 70%, #6f6450);" +
        'box-shadow:0 8px 36px rgba(233,225,209,.32)"></div>' +
        '<div style="font-family:var(--font-serif),Georgia,serif;font-weight:600;font-size:46px;letter-spacing:-.01em;color:#f6f4ef">Market Bubble</div>' +
        `<div style="font:600 11px/1 ui-sans-serif,system-ui;letter-spacing:.3em;text-transform:uppercase;color:#cabba0">${tagline}</div>` +
        '<div style="display:flex;align-items:center;gap:12px;margin-top:2px">' +
        '<span style="height:1px;width:34px;background:rgba(233,225,209,.32)"></span>' +
        '<span style="font-family:var(--font-serif),Georgia,serif;font-style:italic;font-size:13px;color:#cabba0">Presented by Polymarket</span>' +
        '<span style="height:1px;width:34px;background:rgba(233,225,209,.32)"></span>' +
        "</div>";
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
    const bring = async (el: Element | null) => {
      if (!el) return;
      el.scrollIntoView({ block: "nearest" });
      await sleep(280);
    };
    // Drive the show embed through YouTube's iframe API so the hero is always
    // actually playing (long-lived muted embeds otherwise pause into an ugly
    // suggestion wall).
    const forcePlay = () => {
      const f = document.getElementById("mb-show-embed") as HTMLIFrameElement | null;
      f?.contentWindow?.postMessage(
        '{"event":"command","func":"playVideo","args":""}',
        "*",
      );
      f?.contentWindow?.postMessage(
        '{"event":"command","func":"mute","args":""}',
        "*",
      );
    };

    // ---- the film -----------------------------------------------------------
    const mark = (m: string) => {
      win().__filmBeat = m;
    };
    const run = async () => {
      win().__tourActive = true;
      win().__filmErr = "";

      // COLD OPEN — title card; the deck is staged underneath
      mark("title");
      lockupCard("Every stream · One chat");
      card.style.opacity = "1";
      await sleep(620);
      if (cancelled) return;
      const d = useDeck.getState();
      d.setSection("live");
      d.setViewMode("stage");
      d.setHostFilter("all");
      if (!d.demoMode) d.toggleDemo();
      frameOn();
      forcePlay();
      await sleep(2400);
      if (cancelled) return;
      card.style.opacity = "0";
      await sleep(580);
      if (cancelled) return;

      // ACT I — the live room (full-bright; the product is the visual)
      mark("act1:deck");
      forcePlay();
      await say("Market Bubble", "Every stream and every chat, on one screen.");
      await sleep(3200);
      if (cancelled) return;

      mark("act1:hero");
      forcePlay();
      await say("The broadcast", "The show plays natively inside the deck.");
      await sleep(3000);
      if (cancelled) return;

      mark("act1:feed");
      await say("One feed", "Twitch, Kick and X merged in real time. Every message labeled.");
      await sleep(3600);
      if (cancelled) return;

      mark("act1:audience");
      await bring(q('[data-tour="audience"]'));
      await say("Know the room", "Hover any viewer to see where they watch from.");
      const dots = [
        ...document.querySelectorAll('[data-tour="audience"] a[href]'),
      ].filter((a) => /^[A-Z0-9]$/.test(a.textContent?.trim() || ""));
      const dot = dots[3] || dots[0];
      hover(dot);
      await sleep(3200);
      unhover(dot);
      if (cancelled) return;

      mark("act1:cashtag");
      useDeck.getState().broadcast("eyeing $SOL here, this could send 👀");
      await sleep(600);
      await say("Crypto native", "Cashtags pull live prices straight into chat.");
      const chip = [...document.querySelectorAll('[data-tour="chat"] a')]
        .filter((a) => (a.textContent?.trim() || "")[0] === "$")
        .pop();
      hover(chip);
      await sleep(3300);
      unhover(chip);
      if (cancelled) return;

      mark("act1:composer");
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
        await sleep(1800); // watch it land in the room
      }
      if (cancelled) return;

      mark("act1:hosts");
      await say("Follow the hosts", "One click filters everything to Ansem or Banks.");
      const hostBtn = (label: string) =>
        [...document.querySelectorAll('[data-tour="hostswitch"] button')].find(
          (b) => b.textContent?.trim() === label,
        ) as HTMLButtonElement | undefined;
      await sleep(500);
      hostBtn("Ansem")?.click();
      await sleep(2800);
      hostBtn("Both")?.click();
      if (cancelled) return;

      mark("act1:odds");
      await bring(q('[data-tour="odds"]'));
      await say("Live odds", "Real Polymarket markets, priced in real time.");
      await sleep(3100);
      if (cancelled) return;

      // ACT II — the command deck (power view)
      mark("act2:deckview");
      await chapter("Chapter II", "The Command Deck", () => {
        useDeck.getState().setViewMode("deck");
      });
      if (cancelled) return;
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
      mark("act3:markets");
      await chapter("Chapter III", "Markets", () => {
        useDeck.getState().setSection("markets");
      });
      if (cancelled) return;
      await say("The tape", "Live prices, sparklines and market caps from CoinGecko.");
      await sleep(3400);
      if (cancelled) return;

      // ACT IV — leaderboard
      mark("act4:leaders");
      await chapter("Chapter IV", "Leaderboard", () => {
        useDeck.getState().setSection("leaders");
      });
      if (cancelled) return;
      await say("Who moves the room", "A live ranking built from the merged feed.");
      await sleep(3400);
      if (cancelled) return;

      // CLOSE — end card; everything restores underneath it
      mark("close");
      lockupCard("Every stream · One chat");
      card.style.opacity = "1";
      await sleep(620);
      hush();
      frameOff();
      const dd = useDeck.getState();
      dd.setSection("live");
      dd.setViewMode("stage");
      await sleep(3600);
      card.style.opacity = "0";
      await sleep(620);
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

    win().__playShowcase = () => {
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
      third.remove();
      card.remove();
      frameOff();
      win().__tourActive = false;
    };
  }, []);

  return null;
}
