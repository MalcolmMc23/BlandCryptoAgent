import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { normalizeUsername } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params;
  const username = normalizeUsername(rawUsername);

  const userResult = await pool.query<{ id: string; username: string }>(
    `SELECT id, username FROM users WHERE username = $1 LIMIT 1`,
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

  return NextResponse.json({
    username: user.username,
    usd_balance_cents: accountResult.rows[0].usd_balance_cents,
    holdings: holdingsResult.rows
  });
}
