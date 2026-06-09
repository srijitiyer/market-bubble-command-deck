"use client";

import { useEffect } from "react";
import { useDeck } from "@/lib/store";

// A cinematic spotlight walkthrough — dims the deck and glides a single glowing
// highlight from feature to feature, with clean crossfading serif captions and
// smooth veil transitions between sections. No content zoom, no synthetic
// cursor, no hard cuts. Auto-plays on ?tour=1, or window.__playShowcase().
//
// (The earlier zoom/cursor tour is preserved in DemoTour.tsx — ?tour=legacy.)
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const MOVE = 820;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type WinHooks = {
  __tourActive?: boolean;
  __playIntro?: () => void;
  __playOutro?: () => void;
  __playShowcase?: () => void;
};
const win = () => window as unknown as Window & WinHooks;

export function DemoShowcase() {
  useEffect(() => {
    let cancelled = false;

    // ---- spotlight overlay (a transparent window with a huge dimming shadow) -
    const ring =
      "inset 0 0 0 1px rgba(233,225,209,0.4), 0 0 44px rgba(233,225,209,0.12)";
    const spot = document.createElement("div");
    spot.id = "__spot";
    spot.style.cssText =
      "position:fixed;pointer-events:none;z-index:60;border-radius:16px;" +
      "left:50%;top:50%;width:0;height:0;opacity:0;" +
      `box-shadow:0 0 0 5000px rgba(6,6,7,0.55), ${ring};` +
      `transition:left ${MOVE}ms ${EASE},top ${MOVE}ms ${EASE},width ${MOVE}ms ${EASE},height ${MOVE}ms ${EASE},box-shadow .45s ease,opacity .5s ease;`;
    document.body.appendChild(spot);
    const setDim = (a: number) => {
      spot.style.boxShadow = `0 0 0 5000px rgba(6,6,7,${a}), ${ring}`;
    };
    const spotlight = async (el: Element | null, pad = 10, instant = false) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (instant) spot.style.transition = "none";
      spot.style.left = `${r.left - pad}px`;
      spot.style.top = `${r.top - pad}px`;
      spot.style.width = `${r.width + pad * 2}px`;
      spot.style.height = `${r.height + pad * 2}px`;
      if (instant) {
        void spot.offsetWidth;
        spot.style.transition = `left ${MOVE}ms ${EASE},top ${MOVE}ms ${EASE},width ${MOVE}ms ${EASE},height ${MOVE}ms ${EASE},box-shadow .45s ease,opacity .5s ease`;
      }
      spot.style.opacity = "1";
      await sleep(instant ? 80 : MOVE + 60);
    };

    // ---- caption card -----------------------------------------------------
    const cap = document.createElement("div");
    cap.id = "__cap";
    cap.style.cssText =
      "position:fixed;z-index:61;max-width:380px;opacity:0;transform:translateY(10px);pointer-events:none;" +
      `transition:opacity .45s ease,transform .5s ${EASE},left .6s ${EASE},top .6s ${EASE};`;
    document.body.appendChild(cap);
    const setText = (kicker: string, body: string) => {
      cap.innerHTML =
        `<div style="font-family:var(--font-serif),Georgia,serif;font-style:italic;font-weight:600;font-size:12px;letter-spacing:.04em;color:#cabba0;margin-bottom:9px">${kicker}</div>` +
        `<div style="font-family:var(--font-serif),Georgia,serif;font-weight:600;font-size:23px;line-height:1.28;letter-spacing:-.01em;color:#f4f2ec;text-shadow:0 2px 18px rgba(0,0,0,.6)">${body}</div>`;
    };
    const place = () => {
      const sr = spot.getBoundingClientRect();
      const cw = cap.offsetWidth || 360;
      const ch = cap.offsetHeight || 70;
      let top = sr.bottom + 22;
      if (top + ch > window.innerHeight - 24) top = sr.top - ch - 22;
      top = Math.max(24, Math.min(top, window.innerHeight - ch - 24));
      let left = sr.left + sr.width / 2 - cw / 2;
      left = Math.min(Math.max(left, 24), window.innerWidth - cw - 24);
      cap.style.left = `${left}px`;
      cap.style.top = `${top}px`;
    };
    const say = async (kicker: string, body: string) => {
      cap.style.opacity = "0";
      cap.style.transform = "translateY(10px)";
      await sleep(220);
      if (cancelled) return;
      setText(kicker, body);
      place();
      void cap.offsetWidth;
      cap.style.opacity = "1";
      cap.style.transform = "translateY(0)";
    };

    // ---- helpers ----------------------------------------------------------
    const q = (s: string) => document.querySelector(s);
    const fire = (el: Element | null | undefined, types: string[]) =>
      el && types.forEach((t) => el.dispatchEvent(new MouseEvent(t, { bubbles: true })));
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
        await sleep(34);
      }
    };
    const switchTo = async (section: "live" | "markets" | "leaders") => {
      setDim(0.98); // veil up to hide the swap
      cap.style.opacity = "0";
      await sleep(460);
      if (cancelled) return;
      useDeck.getState().setSection(section);
      await sleep(620); // let the new section render
    };

    // ---- choreography -----------------------------------------------------
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
      await sleep(450); // settle after the intro fades

      // 1 — the whole deck
      await spotlight(q("#deck-stage"), 0);
      await say("Market Bubble", "Every stream, every chat, one command deck.");
      await sleep(2700);

      // 2 — the broadcast
      await spotlight(q('[data-tour="hero"]'), 8);
      await say("Watch live", "The show plays right inside the deck.");
      await sleep(2700);

      // 3 — merged feed
      await spotlight(q('[data-tour="chat"]'), 8);
      await say(
        "One unified feed",
        "Twitch, Kick and X merged live, every message labeled with its source.",
      );
      await sleep(3700);

      // 4 — hover a viewer
      await spotlight(q('[data-tour="audience"]'), 8);
      await say("Know the room", "Hover any viewer to see which platform they came from.");
      const dots = [
        ...document.querySelectorAll('[data-tour="audience"] a[href]'),
      ].filter((a) => /^[A-Z0-9]$/.test(a.textContent?.trim() || ""));
      const dot = dots[3] || dots[0];
      fire(dot, ["pointerover", "mouseover", "mouseenter"]);
      await sleep(2900);
      fire(dot, ["mouseout", "mouseleave"]);

      // 5 — cashtag price
      d.broadcast("eyeing $SOL here, this could send 👀");
      await sleep(500);
      await spotlight(q('[data-tour="chat"]'), 8);
      await say("Crypto-native", "Cashtags open a live price card, right inside the chat.");
      const chip = [...document.querySelectorAll('[data-tour="chat"] a')]
        .filter((a) => (a.textContent?.trim() || "")[0] === "$")
        .pop();
      fire(chip, ["pointerover", "mouseover", "mouseenter"]);
      await sleep(3100);
      fire(chip, ["mouseout", "mouseleave"]);

      // 6 — one shared chat
      await spotlight(q('[data-tour="composer"]'), 10);
      await say("One shared chat", "Broadcast once and it lands in the unified room.");
      const composer = q(
        'input[aria-label="Broadcast to the shared chat"]',
      ) as HTMLInputElement | null;
      if (composer) {
        await typeInto(composer, "gm degens, we are SO back");
        await sleep(300);
        composer
          .closest("form")
          ?.querySelector<HTMLButtonElement>('button[type="submit"]')
          ?.click();
      }
      await sleep(2000);

      // 7 — host switch
      await spotlight(q('[data-tour="hostswitch"]'), 8);
      await say("Follow a host", "Filter the whole room to Ansem or Banks.");
      const hostBtn = (label: string) =>
        [...document.querySelectorAll('[data-tour="hostswitch"] button')].find(
          (b) => b.textContent?.trim() === label,
        ) as HTMLButtonElement | undefined;
      hostBtn("Ansem")?.click();
      await sleep(2700);
      hostBtn("Both")?.click();

      // 8 — Polymarket odds
      await spotlight(q('[data-tour="odds"]'), 8);
      await say("Live odds", "Real Polymarket markets on every take, straight from their API.");
      await sleep(3100);

      // 9 — Markets section
      await switchTo("markets");
      await spotlight(q('[data-tour="markets"]'), 8, true);
      setDim(0.55);
      await say("Markets", "A live markets board. Real prices, real sparklines, real odds.");
      await sleep(3300);

      // 10 — Leaderboard section
      await switchTo("leaders");
      await spotlight(q('[data-tour="leaders"]'), 8, true);
      setDim(0.55);
      await say("Leaderboard", "And a live ranking of who's driving the conversation.");
      await sleep(3300);

      // CLOSE — veil, reset to the stage, hand off to the outro
      setDim(0.98);
      cap.style.opacity = "0";
      await sleep(460);
      const dd = useDeck.getState();
      dd.setSection("live");
      dd.setViewMode("stage");
      spot.style.opacity = "0";
      await sleep(420);
      if (win().__playOutro) {
        win().__playOutro!();
        await sleep(6300);
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
      cap.remove();
      win().__tourActive = false;
    };
  }, []);

  return null;
}
