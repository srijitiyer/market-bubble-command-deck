"use client";

// Token market data. We fetch through our own /api/markets route, which proxies
// CoinGecko with shared server-side caching + a last-good fallback, so clients
// never hit CoinGecko's aggressive free-tier rate limit directly.

export interface MarketRow {
  id: string;
  symbol: string;
  usd: number;
  change24h: number;
  marketCap: number;
  spark: number[];
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

const TTL = 30_000;
const cache = new Map<string, { row: MarketRow; ts: number }>();
const inflight = new Map<string, Promise<MarketRow[]>>();

async function fetchFromApi(ids: string[]): Promise<MarketRow[]> {
  const key = ids.slice().sort().join(",");
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async () => {
    try {
      const res = await fetch(`/api/markets?ids=${encodeURIComponent(ids.join(","))}`);
      if (!res.ok) return [];
      const json = (await res.json()) as { rows: MarketRow[] };
      const now = Date.now();
      for (const r of json.rows ?? []) cache.set(r.id, { row: r, ts: now });
      return json.rows ?? [];
    } catch {
      return [];
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export async function getMarkets(symbols: string[]): Promise<MarketRow[]> {
  const wanted = symbols.map((s) => s.toUpperCase()).filter((s) => SYMBOL_TO_ID[s]);
  const ids = wanted.map((s) => SYMBOL_TO_ID[s]);
  const now = Date.now();
  const fresh = ids.every((id) => {
    const c = cache.get(id);
    return c && now - c.ts < TTL;
  });
  if (!fresh) await fetchFromApi(ids);
  // return in requested order, falling back to any cached value
  return wanted
    .map((s) => cache.get(SYMBOL_TO_ID[s])?.row)
    .filter(Boolean) as MarketRow[];
}

export async function getMarketForSymbol(symbol: string): Promise<MarketRow | null> {
  const sym = symbol.toUpperCase();
  const id = SYMBOL_TO_ID[sym];
  if (!id) return null;
  const c = cache.get(id);
  if (c && Date.now() - c.ts < TTL) return c.row;
  await fetchFromApi([id]);
  return cache.get(id)?.row ?? null;
}

export function coingeckoUrl(id: string): string {
  return `https://www.coingecko.com/en/coins/${id}`;
}

export function formatPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 0.01) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return n.toPrecision(3);
}

export function formatMcap(n: number): string {
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}
