import { z } from "zod";

export const symbolSchema = z.enum(["BTC", "ETH", "SOL"]);

export type CryptoSymbol = z.infer<typeof symbolSchema>;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
