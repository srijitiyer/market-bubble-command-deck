import type { ChatMessage } from "./types";

// Lightweight crypto-chat sentiment. Not NLP - keyword scoring tuned to the
// degen lexicon (bullish / copium / FUD). Good enough to drive a live gauge.
const BULL = [
  "bullish", "moon", "send", "sending", "pump", "pumping", "lfg", "buy", "buying",
  "up", "green", "ape", "aping", "wagmi", "based", "100x", "10x", "5x", "gm",
  "+ev", "rocket", "🚀", "alpha", "we're back", "so back", "hodl", "diamond",
  "lambo", "ath", "breakout", "long", "accumulate", "rich",
];
const BEAR = [
  "dump", "dumping", "rug", "rugged", "down", "red", "sell", "selling", "fud",
  "ngmi", "rekt", "crash", "crashing", "copium", "cope", "over", "bear", "bearish",
  "exit", "scam", "dead", "jeet", "paper", "liquidated", "short", "top", "bag",
];

export interface SentimentResult {
  score: number; // -1..1
  bull: number;
  bear: number;
  label: string;
  tone: "bull" | "bear" | "neutral";
}

export function analyzeSentiment(messages: ChatMessage[]): SentimentResult {
  const recent = messages.slice(-90);
  let bull = 0;
  let bear = 0;
  for (const m of recent) {
    const t = m.text.toLowerCase();
    for (const w of BULL) if (t.includes(w)) bull++;
    for (const w of BEAR) if (t.includes(w)) bear++;
  }
  const total = bull + bear;
  const score = total === 0 ? 0 : (bull - bear) / total;
  let label = "Neutral";
  let tone: SentimentResult["tone"] = "neutral";
  if (total >= 2) {
    if (score > 0.33) {
      tone = "bull";
      label = score > 0.7 ? "Euphoric" : "Bullish";
    } else if (score < -0.33) {
      tone = "bear";
      label = score < -0.7 ? "Capitulation" : score < -0.5 ? "FUD" : "Copium";
    } else {
      label = "Chopping";
    }
  }
  return { score, bull, bear, label, tone };
}
