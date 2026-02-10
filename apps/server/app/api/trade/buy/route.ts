import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrice } from "@/lib/prices";
import { isDbUnavailableError, withTransaction } from "@/lib/db";
import { demoBuy } from "@/lib/demoStore";
import { normalizeUsername, symbolSchema } from "@/lib/utils";

const bodySchema = z.object({
  username: z.string().min(1),
  symbol: symbolSchema,
  usd_amount: z.number().positive()
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Invalid body. Expected { username: string, symbol: BTC|ETH|SOL, usd_amount: number }."
      },
      { status: 400 }
    );
  }

  const username = normalizeUsername(parsed.data.username);
  const symbol = parsed.data.symbol;
  const usdAmount = parsed.data.usd_amount;
  const usdCents = Math.round(usdAmount * 100);
  const priceUsd = getPrice(symbol);
  const qty = usdAmount / priceUsd;

  try {
    const result = await withTransaction(async (client) => {
      const userResult = await client.query<{ id: string }>(
        `SELECT id FROM users WHERE username = $1 LIMIT 1`,
        [username]
      );

      const user = userResult.rows[0];

      if (!user) {
        return { error: "USER_NOT_FOUND" as const };
      }

      const accountResult = await client.query<{ usd_balance_cents: number }>(
        `SELECT usd_balance_cents FROM accounts WHERE user_id = $1 FOR UPDATE`,
        [user.id]
      );

      const account = accountResult.rows[0];

      if (!account) {
        return { error: "ACCOUNT_NOT_FOUND" as const };
      }

      if (account.usd_balance_cents < usdCents) {
        return { error: "INSUFFICIENT_USD" as const };
      }

      const updatedBalance = account.usd_balance_cents - usdCents;

      await client.query(
        `UPDATE accounts SET usd_balance_cents = $1 WHERE user_id = $2`,
        [updatedBalance, user.id]
      );

      await client.query(
        `
          INSERT INTO holdings (user_id, symbol, amount)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, symbol)
          DO UPDATE SET amount = holdings.amount + EXCLUDED.amount
        `,
        [user.id, symbol, qty]
      );

      await client.query(
        `
          INSERT INTO transactions (user_id, type, symbol, price_usd, qty, usd_amount)
          VALUES ($1, 'BUY', $2, $3, $4, $5)
        `,
        [user.id, symbol, priceUsd, qty, usdAmount]
      );

      return { updatedBalance };
    });

    if ("error" in result) {
      if (result.error === "USER_NOT_FOUND") {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      if (result.error === "ACCOUNT_NOT_FOUND") {
        return NextResponse.json({ error: "Account not found." }, { status: 404 });
      }
      return NextResponse.json({ error: "Insufficient USD balance." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      symbol,
      price_usd: priceUsd,
      qty: qty.toString(),
      usd_spent: usdAmount,
      usd_balance_cents: result.updatedBalance
    });
  } catch (error) {
    if (isDbUnavailableError(error)) {
      const demo = demoBuy(username, symbol, usdAmount);
      if ("error" in demo) {
        if (demo.error === "USER_NOT_FOUND") {
          return NextResponse.json({ error: "User not found." }, { status: 404 });
        }
        return NextResponse.json({ error: "Insufficient USD balance." }, { status: 400 });
      }
      return NextResponse.json(demo);
    }
    const message = error instanceof Error ? error.message : "Buy failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
