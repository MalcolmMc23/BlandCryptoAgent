import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
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
    const result = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { username } });

      if (!user) {
        user = await tx.user.create({ data: { username } });

        await tx.account.create({
          data: {
            userId: user.id,
            usdBalanceCents: STARTING_BALANCE_CENTS
          }
        });
      }

      const account = await tx.account.findUnique({
        where: { userId: user.id },
        select: { usdBalanceCents: true }
      });

      if (!account) {
        throw new Error("Account missing for user.");
      }

      return { user, usdBalanceCents: account.usdBalanceCents };
    });

    return NextResponse.json({
      user: {
        id: result.user.id,
        username: result.user.username
      },
      usd_balance_cents: result.usdBalanceCents
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Username already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }
}
