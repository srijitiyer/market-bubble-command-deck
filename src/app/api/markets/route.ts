import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Server-side market data proxy. CoinGecko's free API rate-limits hard (429
// after a couple of rapid calls), so hitting it from every client is unreliable.
// Here we fetch once server-side with Vercel data-cache revalidation (shared
// across clients) and keep a module-level last-good cache as a 429 fallback.

interface Row {
  id: string;
  symbol: string;
  usd: number;
  change24h: number;
  marketCap: number;
  spark: number[];
}

const lastGood = new Map<string, Row>();

interface CGCoin {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap: number | null;
  sparkline_in_7d?: { price: number[] };
}

function normalize(c: CGCoin): Row {
  const full = c.sparkline_in_7d?.price ?? [];
  const step = Math.max(1, Math.floor(full.length / 28));
  return {
    id: c.id,
    symbol: c.symbol.toUpperCase(),
    usd: c.current_price,
    change24h: c.price_change_percentage_24h ?? 0,
    marketCap: c.market_cap ?? 0,
    spark: full.filter((_, i) => i % step === 0),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 30);
  if (!ids.length) {
    return NextResponse.json({ rows: [] });
  }

  const url =
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(
      ",",
    )}&sparkline=true&price_change_percentage=24h`;

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      // Shared Vercel data cache: one upstream call per ~45s across all clients.
      next: { revalidate: 45 },
    });
    if (!res.ok) throw new Error(`cg ${res.status}`);
    const json = (await res.json()) as CGCoin[];
    const rows = json.map(normalize);
    for (const r of rows) lastGood.set(r.id, r);
    // preserve requested order
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as Row[];
    return NextResponse.json(
      { rows: ordered },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=45" } },
    );
  } catch {
    // 429 / network: serve last-good for whatever we have cached
    const stale = ids.map((id) => lastGood.get(id)).filter(Boolean) as Row[];
    return NextResponse.json(
      { rows: stale, stale: true },
      { headers: { "Cache-Control": "public, max-age=15" } },
    );
  }
}
