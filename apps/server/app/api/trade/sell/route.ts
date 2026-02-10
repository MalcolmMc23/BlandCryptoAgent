import { NextResponse } from "next/server";
import { z } from "zod";

import { getPrice } from "@/lib/prices";
import { withTransaction } from "@/lib/db";
import { normalizeUsername, symbolSchema } from "@/lib/utils";

const bodySchema = z.object({
  username: z.string().min(1),
  symbol: symbolSchema,
  qty: z.string().min(1)
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Invalid body. Expected { username: string, symbol: BTC|ETH|SOL, qty: string }."
      },
      { status: 400 }
    );
  }

  const username = normalizeUsername(parsed.data.username);
  const symbol = parsed.data.symbol;
  const qty = Number(parsed.data.qty);

  if (!Number.isFinite(qty) || qty <= 0) {
    return NextResponse.json({ error: "qty must be a valid positive number." }, { status: 400 });
  }

  const priceUsd = getPrice(symbol);
  const usdReceived = qty * priceUsd;
  const usdReceivedCents = Math.round(usdReceived * 100);

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

      const holdingResult = await client.query<{ amount: string }>(
        `SELECT amount::text AS amount FROM holdings WHERE user_id = $1 AND symbol = $2 FOR UPDATE`,
        [user.id, symbol]
      );

      const holding = holdingResult.rows[0];

      if (!holding || Number(holding.amount) < qty) {
        return { error: "INSUFFICIENT_HOLDINGS" as const };
      }

      const newHoldingAmount = Number(holding.amount) - qty;

      await client.query(
        `UPDATE holdings SET amount = $1 WHERE user_id = $2 AND symbol = $3`,
        [newHoldingAmount, user.id, symbol]
      );

      const updatedBalance = account.usd_balance_cents + usdReceivedCents;

      await client.query(
        `UPDATE accounts SET usd_balance_cents = $1 WHERE user_id = $2`,
        [updatedBalance, user.id]
      );

      await client.query(
        `
          INSERT INTO transactions (user_id, type, symbol, price_usd, qty, usd_amount)
          VALUES ($1, 'SELL', $2, $3, $4, $5)
        `,
        [user.id, symbol, priceUsd, qty, usdReceived]
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
      return NextResponse.json({ error: "Insufficient holdings." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      symbol,
      price_usd: priceUsd,
      qty_sold: qty.toString(),
      usd_received: usdReceived,
      usd_balance_cents: result.updatedBalance
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sell failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
