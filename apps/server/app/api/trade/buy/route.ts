import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getPrice } from "@/lib/prices";
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { username } });
      if (!user) {
        return { error: "USER_NOT_FOUND" as const };
      }

      const account = await tx.account.findUnique({ where: { userId: user.id } });
      if (!account) {
        return { error: "ACCOUNT_NOT_FOUND" as const };
      }

      if (account.usdBalanceCents < usdCents) {
        return { error: "INSUFFICIENT_USD" as const };
      }

      const qty = new Prisma.Decimal(usdAmount).div(priceUsd);
      const holding = await tx.holding.findUnique({
        where: {
          userId_symbol: {
            userId: user.id,
            symbol
          }
        }
      });

      const newHoldingAmount = holding
        ? holding.amount.plus(qty)
        : new Prisma.Decimal(qty);

      await tx.holding.upsert({
        where: {
          userId_symbol: {
            userId: user.id,
            symbol
          }
        },
        update: {
          amount: newHoldingAmount
        },
        create: {
          userId: user.id,
          symbol,
          amount: qty
        }
      });

      const updatedAccount = await tx.account.update({
        where: { userId: user.id },
        data: {
          usdBalanceCents: account.usdBalanceCents - usdCents
        }
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "BUY",
          symbol,
          priceUsd: new Prisma.Decimal(priceUsd),
          qty,
          usdAmount: new Prisma.Decimal(usdAmount)
        }
      });

      return {
        ok: true as const,
        qty,
        usdBalanceCents: updatedAccount.usdBalanceCents
      };
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
      qty: result.qty.toString(),
      usd_spent: usdAmount,
      usd_balance_cents: result.usdBalanceCents
    });
  } catch {
    return NextResponse.json({ error: "Buy failed." }, { status: 500 });
  }
}
