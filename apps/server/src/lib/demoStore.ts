import crypto from "crypto";

import { getPrice } from "@/lib/prices";
import type { CryptoSymbol } from "@/lib/utils";

const STARTING_BALANCE_CENTS = 1_000_000;

type DemoUser = {
  id: string;
  username: string;
  usdBalanceCents: number;
  holdings: Record<CryptoSymbol, number>;
};

declare global {
  // eslint-disable-next-line no-var
  var demoUsers: Map<string, DemoUser> | undefined;
}

const users = global.demoUsers || new Map<string, DemoUser>();
if (process.env.NODE_ENV !== "production") {
  global.demoUsers = users;
}

function toQtyString(value: number): string {
  return Number(value.toFixed(12)).toString();
}

function getOrCreate(username: string): DemoUser {
  const existing = users.get(username);
  if (existing) {
    return existing;
  }

  const user: DemoUser = {
    id: crypto.randomUUID(),
    username,
    usdBalanceCents: STARTING_BALANCE_CENTS,
    holdings: { BTC: 0, ETH: 0, SOL: 0 }
  };

  users.set(username, user);
  return user;
}

export function demoCreateUser(username: string) {
  const user = getOrCreate(username);
  return {
    user: { id: user.id, username: user.username },
    usd_balance_cents: user.usdBalanceCents
  };
}

export function demoLookupUser(username: string) {
  const user = users.get(username);
  if (!user) {
    return { exists: false as const };
  }

  return {
    exists: true as const,
    user: { id: user.id, username: user.username }
  };
}

export function demoGetBalance(username: string) {
  const user = users.get(username);
  if (!user) {
    return null;
  }

  return {
    username: user.username,
    usd_balance_cents: user.usdBalanceCents,
    holdings: (Object.keys(user.holdings) as CryptoSymbol[])
      .filter((symbol) => user.holdings[symbol] > 0)
      .map((symbol) => ({
        symbol,
        amount: toQtyString(user.holdings[symbol])
      }))
  };
}

export function demoBuy(username: string, symbol: CryptoSymbol, usdAmount: number) {
  const user = users.get(username);
  if (!user) {
    return { error: "USER_NOT_FOUND" as const };
  }

  const usdCents = Math.round(usdAmount * 100);
  if (user.usdBalanceCents < usdCents) {
    return { error: "INSUFFICIENT_USD" as const };
  }

  const priceUsd = getPrice(symbol);
  const qty = usdAmount / priceUsd;

  user.usdBalanceCents -= usdCents;
  user.holdings[symbol] += qty;

  return {
    ok: true as const,
    symbol,
    price_usd: priceUsd,
    qty: toQtyString(qty),
    usd_spent: usdAmount,
    usd_balance_cents: user.usdBalanceCents
  };
}

export function demoSell(username: string, symbol: CryptoSymbol, qty: number) {
  const user = users.get(username);
  if (!user) {
    return { error: "USER_NOT_FOUND" as const };
  }

  if (user.holdings[symbol] < qty) {
    return { error: "INSUFFICIENT_HOLDINGS" as const };
  }

  const priceUsd = getPrice(symbol);
  const usdReceived = qty * priceUsd;
  const usdReceivedCents = Math.round(usdReceived * 100);

  user.holdings[symbol] -= qty;
  user.usdBalanceCents += usdReceivedCents;

  return {
    ok: true as const,
    symbol,
    price_usd: priceUsd,
    qty_sold: toQtyString(qty),
    usd_received: usdReceived,
    usd_balance_cents: user.usdBalanceCents
  };
}
