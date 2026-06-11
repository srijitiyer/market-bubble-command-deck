import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Live Polymarket odds via the public Gamma API (crypto tag). Fetched once
// server-side with Vercel data-cache revalidation (shared across clients), with
// a module-level last-good cache and a small seeded set as fallbacks so the
// panel always renders something even if Gamma is briefly unreachable.

interface Mkt {
  question: string;
  prob: number; // Yes %, 0-100
  volume: number; // 24h volume, USD
  slug: string;
}

let lastGood: Mkt[] = [];

const SEED: Mkt[] = [
  { question: "Will Bitcoin dip to $50,000 in June?", prob: 12, volume: 120000, slug: "" },
  { question: "Will Bitcoin reach $65,000 in June?", prob: 71, volume: 95000, slug: "" },
  { question: "Bitcoin Up or Down today?", prob: 54, volume: 60000, slug: "" },
];

interface GammaMarket {
  question?: string;
  outcomePrices?: string; // stringified ["0.10","0.90"]
  volume24hr?: number;
  slug?: string;
  // the public polymarket.com URL uses the *event* slug, not the market slug
  events?: { slug?: string }[];
}

// Polymarket's crypto tag. Markets are ordered by 24h volume; we keep the ones
// with genuinely uncertain odds (8-92%) and real volume so the panel reads as a
// live book rather than a wall of 0%/100% near-settled markets.
const GAMMA =
  "https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=120&order=volume24hr&ascending=false&tag_id=21";

export async function GET() {
  try {
    const res = await fetch(GAMMA, {
      headers: { accept: "application/json" },
      next: { revalidate: 60 }, // one upstream call per ~60s across all clients
    });
    if (!res.ok) throw new Error(`gamma ${res.status}`);
    const json = (await res.json()) as GammaMarket[] | { data?: GammaMarket[] };
    const list = Array.isArray(json) ? json : json.data ?? [];

    const markets: Mkt[] = [];
    const seen = new Set<string>();
    for (const m of list) {
      if (!m.question || markets.length >= 8) continue;
      let prob: number;
      try {
        prob = Math.round(parseFloat(JSON.parse(m.outcomePrices || "[]")[0]) * 100);
      } catch {
        continue;
      }
      const volume = Math.round(m.volume24hr ?? 0);
      if (!Number.isFinite(prob) || prob < 8 || prob > 92 || volume < 5000) continue;
      const key = m.question.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const slug = m.events?.[0]?.slug || "";
      markets.push({ question: m.question.trim(), prob, volume, slug });
    }

    if (markets.length) lastGood = markets;
    const payload = markets.length ? markets : lastGood.length ? lastGood : SEED;
    return NextResponse.json(
      { markets: payload, live: markets.length > 0 },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } },
    );
  } catch {
    return NextResponse.json(
      { markets: lastGood.length ? lastGood : SEED, live: false, stale: true },
      { headers: { "Cache-Control": "public, max-age=20" } },
    );
  }
}
