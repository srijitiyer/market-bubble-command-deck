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
// Runs on Shift+T (or window.__playShowcase()) — no auto-start, so recording
// is one keypress. The older zoom/cursor tour is preserved at ?tour=legacy
// (Shift+L).


const MOVE = 900;
const SCALE = 0.9;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type WinHooks = {
  __tourActive?: boolean;
  __playShowcase?: () => void;
  __mbSetLayout?: (l: Record<string, number>) => void;
  // film telemetry (debugging/verification): current beat + any crash
  __filmBeat?: string;
  __filmErr?: string;
};
const win = () => window as unknown as Window & WinHooks;

export function DemoShowcase() {
  useEffect(() => {
    let cancelled = false;

    // ---- the frame: inset the whole deck, reserving the lower third --------
    const stage = document.getElementById("deck-stage");
    const frameOff = () => {
      if (!stage) return;
      stage.style.transform = "";
      stage.style.transformOrigin = "0 0";
    };

    // ---- spotlight: an SVG mask window in a dim field ----------------------
    // One rAF loop smoothly pursues the (continuously re-measured) target, so
    // the window stays glued to panels even as the live deck reflows under it.
    // SVG attributes + no CSS transitions + no shadow blur = cheap paints; DOM
    // writes are skipped entirely once the window has settled.
    const SVGNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("id", "__spot");
    svg.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;z-index:60;pointer-events:none;opacity:0;transition:opacity .5s ease;";
    svg.innerHTML =
      '<defs><mask id="__spotmask">' +
      '<rect x="0" y="0" width="100%" height="100%" fill="white"/>' +
      '<rect id="__hole" x="0" y="0" width="0" height="0" rx="14" fill="black"/>' +
      "</mask></defs>" +
      '<rect x="0" y="0" width="100%" height="100%" fill="rgba(5,5,6,0.68)" mask="url(#__spotmask)"/>' +
      '<rect id="__ring" x="0" y="0" width="0" height="0" rx="14" fill="none" stroke="rgba(233,225,209,0.38)" stroke-width="1"/>';
    document.body.appendChild(svg);
    const hole = svg.querySelector("#__hole") as SVGRectElement;
    const ringEl = svg.querySelector("#__ring") as SVGRectElement;

    let target: { el: Element; pad: number; padTop: number } | null = null;
    const cur = { x: 0, y: 0, w: 0, h: 0 };
    let drawn = { x: -1, y: -1, w: -1, h: -1 };
    let last = 0;
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(64, now - last || 16);
      last = now;
      if (!target) return;
      const r = target.el.getBoundingClientRect();
      const goal = {
        x: r.left - target.pad,
        y: r.top - target.pad - target.padTop,
        w: r.width + target.pad * 2,
        h: r.height + target.pad * 2 + target.padTop,
      };
      // smooth pursuit: exponential ease toward the live goal (~1s big moves,
      // instant micro-corrections when a panel shifts a few px)
      const k = 1 - Math.exp(-dt / 240);
      cur.x += (goal.x - cur.x) * k;
      cur.y += (goal.y - cur.y) * k;
      cur.w += (goal.w - cur.w) * k;
      cur.h += (goal.h - cur.h) * k;
      const settled =
        Math.abs(goal.x - cur.x) < 0.4 &&
        Math.abs(goal.y - cur.y) < 0.4 &&
        Math.abs(goal.w - cur.w) < 0.4 &&
        Math.abs(goal.h - cur.h) < 0.4;
      if (settled) {
        cur.x = goal.x;
        cur.y = goal.y;
        cur.w = goal.w;
        cur.h = goal.h;
      }
      // Only touch the DOM when the window actually moved — a same-value
      // setAttribute still invalidates the full-screen masked layer, and a
      // 60fps repaint storm of that layer can starve the page.
      if (
        Math.abs(cur.x - drawn.x) > 0.05 ||
        Math.abs(cur.y - drawn.y) > 0.05 ||
        Math.abs(cur.w - drawn.w) > 0.05 ||
        Math.abs(cur.h - drawn.h) > 0.05
      ) {
        drawn = { ...cur };
        for (const el of [hole, ringEl]) {
          el.setAttribute("x", cur.x.toFixed(1));
          el.setAttribute("y", cur.y.toFixed(1));
          el.setAttribute("width", Math.max(0, cur.w).toFixed(1));
          el.setAttribute("height", Math.max(0, cur.h).toFixed(1));
        }
      }
    };
    raf = requestAnimationFrame(tick);

    const spotlight = async (
      el: Element | null,
      pad = 8,
      instant = false,
      padTop = 0, // extra headroom so hovercards pop inside the lit window
    ) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (instant || svg.style.opacity === "0") {
        cur.x = r.left - pad;
        cur.y = r.top - pad - padTop;
        cur.w = r.width + pad * 2;
        cur.h = r.height + pad * 2 + padTop;
      }
      target = { el, pad, padTop };
      svg.style.opacity = "1";
      await sleep(instant ? 80 : MOVE + 80);
    };
    const spotOff = () => {
      target = null;
      svg.style.opacity = "0";
    };
    // settle a below-fold target into view before lighting it (no-op if visible)
    const bring = async (el: Element | null) => {
      if (!el) return;
      el.scrollIntoView({ block: "nearest" });
      await sleep(280);
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

    // Title / end cards — the film's own bookends. Vanilla DOM (the pearl orb
    // is a plain gradient), so the film never depends on the React intro/outro
    // replaying correctly mid-session.
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

    // ---- the film -----------------------------------------------------------
    const mark = (m: string) => {
      win().__filmBeat = m;
    };
    const run = async () => {
      win().__tourActive = true;
      win().__filmErr = "";

      // COLD OPEN — the film's own title card; the deck is staged underneath
      // (live section, demo traffic, framed) so the reveal lands ready-made.
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
      if (stage) {
        stage.style.transition = "none";
        stage.style.transformOrigin = "50% 0";
        stage.style.transform = `scale(${SCALE})`;
      }
      const embed = document.getElementById("mb-show-embed") as HTMLIFrameElement | null;
      if (embed) embed.src = embed.src; // reload -> fresh muted autoplay, no pause wall
      await sleep(2400);
      if (cancelled) return;
      card.style.opacity = "0";
      await sleep(580);
      if (cancelled) return;

      // ACT I — the live room
      mark("act1:deck");
      await spotlight(q("#deck-stage"), 0);
      await say("Market Bubble", "Every stream and every chat, on one screen.");
      await sleep(3000);
      if (cancelled) return;

      mark("act1:hero");
      await spotlight(q('[data-tour="hero"]'));
      await say("The broadcast", "The show plays natively inside the deck.");
      await sleep(2900);
      if (cancelled) return;

      mark("act1:feed");
      await spotlight(q('[data-tour="chat"]'));
      await say("One feed", "Twitch, Kick and X merged in real time. Every message labeled.");
      await sleep(3600);
      if (cancelled) return;

      mark("act1:audience");
      await bring(q('[data-tour="audience"]'));
      await spotlight(q('[data-tour="audience"]'), 8, false, 150);
      await say("Know the room", "Hover any viewer to see where they watch from.");
      const dots = [
        ...document.querySelectorAll('[data-tour="audience"] a[href]'),
      ].filter((a) => /^[A-Z0-9]$/.test(a.textContent?.trim() || ""));
      const dot = dots[3] || dots[0];
      hover(dot);
      await sleep(3000);
      unhover(dot);
      if (cancelled) return;

      mark("act1:cashtag");
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

      mark("act1:composer");
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
        await sleep(450);
        await spotlight(q('[data-tour="chat"]')); // watch it land in the room
        await sleep(1500);
      }
      if (cancelled) return;

      mark("act1:hosts");
      await spotlight(q('[data-tour="hero"]'));
      await say("Follow the hosts", "One click filters everything to Ansem or Banks.");
      const hostBtn = (label: string) =>
        [...document.querySelectorAll('[data-tour="hostswitch"] button')].find(
          (b) => b.textContent?.trim() === label,
        ) as HTMLButtonElement | undefined;
      hostBtn("Ansem")?.click();
      await sleep(3000);
      hostBtn("Both")?.click();
      if (cancelled) return;

      mark("act1:odds");
      await bring(q('[data-tour="odds"]'));
      await spotlight(q('[data-tour="odds"]'));
      await say("Live odds", "Real Polymarket markets, priced in real time.");
      await sleep(3100);
      if (cancelled) return;

      // ACT II — the command deck (power view)
      mark("act2:deckview");
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
      mark("act3:markets");
      await chapter("Chapter III", "Markets", () => {
        useDeck.getState().setSection("markets");
      });
      if (cancelled) return;
      await spotlight(q('[data-tour="markets"]'), 6, true);
      await say("The tape", "Live prices, sparklines and market caps from CoinGecko.");
      await sleep(3400);
      if (cancelled) return;

      // ACT IV — leaderboard
      mark("act4:leaders");
      await chapter("Chapter IV", "Leaderboard", () => {
        useDeck.getState().setSection("leaders");
      });
      if (cancelled) return;
      await spotlight(q('[data-tour="leaders"]'), 6, true);
      await say("Who moves the room", "A live ranking built from the merged feed.");
      await sleep(3400);
      if (cancelled) return;

      mark("close");
      // CLOSE — the film's own end card; everything restores underneath it,
      // and the recording ends held on the brand lockup.
      lockupCard("Every stream · One chat");
      card.style.opacity = "1";
      await sleep(620);
      spotOff();
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
    // No auto-start: the film runs on Shift+T (its own title card opens it),
    // so a recording is one keypress and hands off.
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
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      svg.remove();
      third.remove();
      card.remove();
      frameOff();
      win().__tourActive = false;
    };
  }, []);

  return null;
}
