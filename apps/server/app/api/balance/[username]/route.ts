import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getPrice } from "@/lib/prices";
import type { CryptoSymbol } from "@/lib/utils";
import { normalizeUsername } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params;
  const username = normalizeUsername(rawUsername);

  const userResult = await pool.query<{ id: string; username: string; phone_number: string | null }>(
    `SELECT id, username, phone_number FROM users WHERE username = $1 LIMIT 1`,
    [username]
  );

  const user = userResult.rows[0];

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const accountResult = await pool.query<{ usd_balance_cents: number }>(
    `SELECT usd_balance_cents FROM accounts WHERE user_id = $1 LIMIT 1`,
    [user.id]
  );

  if (!accountResult.rows[0]) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const holdingsResult = await pool.query<{ symbol: string; amount: string }>(
    `
      SELECT symbol, amount::text AS amount
      FROM holdings
      WHERE user_id = $1 AND amount > 0
      ORDER BY symbol ASC
    `,
    [user.id]
  );

  const holdings = holdingsResult.rows;
  const holdingsValueUsd = holdings.reduce((sum, holding) => {
    const symbol = holding.symbol as CryptoSymbol;
    const amount = Number(holding.amount);
    const price = getPrice(symbol);
    return sum + amount * price;
  }, 0);

  const cashUsd = accountResult.rows[0].usd_balance_cents / 100;
  const totalValueUsd = cashUsd + holdingsValueUsd;

  return NextResponse.json({
    username: user.username,
    phone_number: user.phone_number,
    usd_balance_cents: accountResult.rows[0].usd_balance_cents,
    holdings,
    total_value_usd: Number(totalValueUsd.toFixed(2)),
    total_value_cents: Math.round(totalValueUsd * 100)
  });
}
