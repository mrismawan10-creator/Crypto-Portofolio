type CoinIdMap = Record<string, string>;

// Map common symbols to CoinGecko IDs
export const COIN_IDS: CoinIdMap = {
  BTC: "bitcoin",
  HYPE: "hyperliquid",
};

export type PriceResponse = Record<string, { usd: number }>;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchUsdPricesForSymbols(symbols: string[]) {
  const ids = symbols
    .map((s) => COIN_IDS[s.toUpperCase()])
    .filter(Boolean)
    .join(",");

  if (!ids) return {} as PriceResponse;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd`;

  // Optional API key support (free/demo or pro)
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers: Record<string, string> = {};
  if (apiKey) {
    // CoinGecko demo header; pro uses 'x-cg-pro-api-key'.
    headers["x-cg-demo-api-key"] = apiKey;
  }

  // Basic retry with backoff to handle transient 429/5xx
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store", headers });
      if (res.ok) {
        return (await res.json()) as PriceResponse;
      }
      lastErr = new Error(`CoinGecko responded ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await sleep(250 * (attempt + 1));
  }
  console.warn("Failed to fetch prices from CoinGecko:", lastErr);
  return {} as PriceResponse;
}

export function symbolToCoinId(symbol: string) {
  return COIN_IDS[symbol.toUpperCase()];
}
