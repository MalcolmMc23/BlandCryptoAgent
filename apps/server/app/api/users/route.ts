import { NextResponse } from "next/server";
import { z } from "zod";

import { withTransaction } from "@/lib/db";
import { normalizeUsername } from "@/lib/utils";

const bodySchema = z.object({
  username: z.string().min(1),
  phone_number: z.string().min(1)
});

const STARTING_BALANCE_CENTS = 1_000_000;

async function createOrUpsertUser(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body. Expected { username: string, phone_number: string }." },
      { status: 400 }
    );
  }

  const username = normalizeUsername(parsed.data.username);
  const phoneNumber = parsed.data.phone_number.trim();

  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  if (!phoneNumber) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }

  try {
    const result = await withTransaction(async (client) => {
      const upsertUser = await client.query<{
        id: string;
        username: string;
        phone_number: string | null;
      }>(
        `
          INSERT INTO users (username, phone_number)
          VALUES ($1, $2)
          ON CONFLICT (username) DO UPDATE SET
            username = EXCLUDED.username,
            phone_number = EXCLUDED.phone_number
          RETURNING id, username, phone_number
        `,
        [username, phoneNumber]
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
        username: result.user.username,
        phone_number: result.user.phone_number
      },
      usd_balance_cents: result.usdBalanceCents
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return createOrUpsertUser(req);
}

export async function PUT(req: Request) {
  return createOrUpsertUser(req);
}
