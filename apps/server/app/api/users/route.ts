import { NextResponse } from "next/server";
import { z } from "zod";

import { isDbUnavailableError, withTransaction } from "@/lib/db";
import { demoCreateUser } from "@/lib/demoStore";
import { normalizeUsername } from "@/lib/utils";

const bodySchema = z.object({
  username: z.string().min(1)
});

const STARTING_BALANCE_CENTS = 1_000_000;

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body. Expected { username: string }." },
      { status: 400 }
    );
  }

  const username = normalizeUsername(parsed.data.username);

  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  try {
    const result = await withTransaction(async (client) => {
      const upsertUser = await client.query<{
        id: string;
        username: string;
      }>(
        `
          INSERT INTO users (username)
          VALUES ($1)
          ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
          RETURNING id, username
        `,
        [username]
      );

      const user = upsertUser.rows[0];

      await client.query(
        `
          INSERT INTO accounts (user_id, usd_balance_cents)
          VALUES ($1, $2)
          ON CONFLICT (user_id) DO NOTHING
        `,
        [user.id, STARTING_BALANCE_CENTS]
      );

      const account = await client.query<{ usd_balance_cents: number }>(
        `SELECT usd_balance_cents FROM accounts WHERE user_id = $1`,
        [user.id]
      );

      return {
        user,
        usdBalanceCents: account.rows[0].usd_balance_cents
      };
    });

    return NextResponse.json({
      user: {
        id: result.user.id,
        username: result.user.username
      },
      usd_balance_cents: result.usdBalanceCents
    });
  } catch (error) {
    if (isDbUnavailableError(error)) {
      return NextResponse.json(demoCreateUser(username));
    }
    const message = error instanceof Error ? error.message : "Failed to create user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
