type CoinIdMap = Record<string, string>;

// Map common symbols to CoinGecko IDs
export const COIN_IDS: CoinIdMap = {
  BTC: "bitcoin",
  HYPE: "hyperliquid",
};

export type PriceResponse = Record<string, { usd: number }>;

export async function fetchUsdPricesForSymbols(symbols: string[]) {
  const ids = symbols
    .map((s) => COIN_IDS[s.toUpperCase()])
    .filter(Boolean)
    .join(",");

  if (!ids) return {} as PriceResponse;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    ids,
  )}&vs_currencies=usd`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch prices from CoinGecko");
  return (await res.json()) as PriceResponse;
}

export function symbolToCoinId(symbol: string) {
  return COIN_IDS[symbol.toUpperCase()];
}

