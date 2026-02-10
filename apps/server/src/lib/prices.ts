import type { CryptoSymbol } from "@/lib/utils";

export const FAKE_PRICES_USD: Record<CryptoSymbol, number> = {
  BTC: 50000,
  ETH: 2500,
  SOL: 120
};

export function getPrice(symbol: CryptoSymbol): number {
  return FAKE_PRICES_USD[symbol];
}
