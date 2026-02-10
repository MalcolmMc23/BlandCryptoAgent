import type { Symbol } from "@prisma/client";

export const FAKE_PRICES_USD: Record<Symbol, number> = {
  BTC: 50000,
  ETH: 2500,
  SOL: 120
};

export function getPrice(symbol: Symbol): number {
  return FAKE_PRICES_USD[symbol];
}
