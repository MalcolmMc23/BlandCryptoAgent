import { z } from "zod";

export const symbolSchema = z.enum(["BTC", "ETH", "SOL"]);

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function toCents(usd: number): number {
  return Math.round(usd * 100);
}

export function fromDecimalToString(value: unknown): string {
  return String(value);
}
