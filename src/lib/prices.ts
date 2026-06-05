"use client";

// Live token prices from CoinGecko's public API (CORS-open, no key). Powers the
// ticker rail and the $cashtag hovercards. Cached in-memory with a short TTL so
// hovering many cashtags doesn't hammer the endpoint.

export interface TokenPrice {
  usd: number;
  change24h: number;
  marketCap: number;
}

// Common crypto-stream cashtags -> CoinGecko ids.
export const SYMBOL_TO_ID: Record<string, string> = {
  SOL: "solana",
  BTC: "bitcoin",
  ETH: "ethereum",
  BONK: "bonk",
  WIF: "dogwifcoin",
  POPCAT: "popcat",
  PEPE: "pepe",
  DOGE: "dogecoin",
  JUP: "jupiter-exchange-solana",
  PUMP: "pump-fun",
  MOG: "mog-coin",
  DEGEN: "degen-base",
  FARTCOIN: "fartcoin",
  MOODENG: "moo-deng",
  PNUT: "peanut-the-squirrel",
  USDC: "usd-coin",
};

// Symbols shown in the top ticker rail (all real, on CoinGecko).
export const RAIL_SYMBOLS = ["SOL", "BTC", "ETH", "WIF", "BONK", "POPCAT", "PEPE", "DOGE"];

const cache = new Map<string, { value: TokenPrice; ts: number }>();
const inflight = new Map<string, Promise<TokenPrice | null>>();
const TTL = 30_000;

const CG = "https://api.coingecko.com/api/v3/simple/price";

async function fetchIds(ids: string[]): Promise<Record<string, TokenPrice>> {
  const url = `${CG}?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  const out: Record<string, TokenPrice> = {};
  for (const id of ids) {
    const row = json[id];
    if (row && typeof row.usd === "number") {
      out[id] = {
        usd: row.usd,
        change24h: row.usd_24h_change ?? 0,
        marketCap: row.usd_market_cap ?? 0,
      };
    }
  }
  return out;
}

export async function getPricesBySymbol(
  symbols: string[],
): Promise<Record<string, TokenPrice>> {
  const now = Date.now();
  const wanted = symbols
    .map((s) => s.toUpperCase())
    .filter((s) => SYMBOL_TO_ID[s]);
  const out: Record<string, TokenPrice> = {};
  const missingIds: string[] = [];

  for (const sym of wanted) {
    const id = SYMBOL_TO_ID[sym];
    const c = cache.get(id);
    if (c && now - c.ts < TTL) out[sym] = c.value;
    else missingIds.push(id);
  }

  if (missingIds.length) {
    try {
      const fetched = await fetchIds([...new Set(missingIds)]);
      for (const sym of wanted) {
        const id = SYMBOL_TO_ID[sym];
        if (fetched[id]) {
          cache.set(id, { value: fetched[id], ts: now });
          out[sym] = fetched[id];
        }
      }
    } catch {
      // serve whatever cache we have
    }
  }
  return out;
}

export async function getPriceForSymbol(symbol: string): Promise<TokenPrice | null> {
  const sym = symbol.toUpperCase();
  const id = SYMBOL_TO_ID[sym];
  if (!id) return null;
  const now = Date.now();
  const c = cache.get(id);
  if (c && now - c.ts < TTL) return c.value;
  if (inflight.has(id)) return inflight.get(id)!;
  const p = fetchIds([id])
    .then((r) => {
      if (r[id]) {
        cache.set(id, { value: r[id], ts: Date.now() });
        return r[id];
      }
      return null;
    })
    .catch(() => null)
    .finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

export interface MarketRow {
  id: string;
  symbol: string;
  usd: number;
  change24h: number;
  marketCap: number;
  spark: number[];
}

let marketsCache: { rows: MarketRow[]; ts: number } | null = null;

export async function getMarkets(symbols: string[]): Promise<MarketRow[]> {
  if (marketsCache && Date.now() - marketsCache.ts < TTL) return marketsCache.rows;
  const ids = symbols.map((s) => SYMBOL_TO_ID[s.toUpperCase()]).filter(Boolean);
  const url =
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(
      ",",
    )}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as Array<{
      id: string;
      symbol: string;
      current_price: number;
      price_change_percentage_24h: number;
      market_cap: number;
      sparkline_in_7d?: { price: number[] };
    }>;
    // preserve the requested symbol order
    const byId = new Map(json.map((r) => [r.id, r]));
    const rows: MarketRow[] = [];
    for (const sym of symbols.map((s) => s.toUpperCase())) {
      const id = SYMBOL_TO_ID[sym];
      const r = id && byId.get(id);
      if (!r) continue;
      const full = r.sparkline_in_7d?.price ?? [];
      // downsample to ~28 points for a compact sparkline
      const step = Math.max(1, Math.floor(full.length / 28));
      const spark = full.filter((_, i) => i % step === 0);
      rows.push({
        id: r.id,
        symbol: sym,
        usd: r.current_price,
        change24h: r.price_change_percentage_24h ?? 0,
        marketCap: r.market_cap ?? 0,
        spark,
      });
    }
    marketsCache = { rows, ts: Date.now() };
    return rows;
  } catch {
    return marketsCache?.rows ?? [];
  }
}

export function coingeckoUrl(id: string): string {
  return `https://www.coingecko.com/en/coins/${id}`;
}

export function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 0.01) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  // tiny memecoin prices: show leading sig figs
  return n.toPrecision(3);
}

export function formatMcap(n: number): string {
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}
