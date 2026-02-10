import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getPrice } from "@/lib/prices";
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

  let qty: Prisma.Decimal;
  try {
    qty = new Prisma.Decimal(parsed.data.qty);
  } catch {
    return NextResponse.json({ error: "qty must be a valid decimal." }, { status: 400 });
  }

  if (qty.lte(0)) {
    return NextResponse.json({ error: "qty must be greater than zero." }, { status: 400 });
  }

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

      const holding = await tx.holding.findUnique({
        where: {
          userId_symbol: {
            userId: user.id,
            symbol
          }
        }
      });

      if (!holding || holding.amount.lt(qty)) {
        return { error: "INSUFFICIENT_HOLDINGS" as const };
      }

      const newHoldingAmount = holding.amount.minus(qty);

      await tx.holding.update({
        where: {
          userId_symbol: {
            userId: user.id,
            symbol
          }
        },
        data: {
          amount: newHoldingAmount
        }
      });

      const usdReceived = qty.mul(priceUsd);
      const usdReceivedCents = usdReceived.mul(100).toDecimalPlaces(0);

      const updatedAccount = await tx.account.update({
        where: { userId: user.id },
        data: {
          usdBalanceCents: account.usdBalanceCents + usdReceivedCents.toNumber()
        }
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: "SELL",
          symbol,
          priceUsd: new Prisma.Decimal(priceUsd),
          qty,
          usdAmount: usdReceived
        }
      });

      return {
        ok: true as const,
        usdReceived,
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
      return NextResponse.json({ error: "Insufficient holdings." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      symbol,
      price_usd: priceUsd,
      qty_sold: qty.toString(),
      usd_received: result.usdReceived.toNumber(),
      usd_balance_cents: result.usdBalanceCents
    });
  } catch {
    return NextResponse.json({ error: "Sell failed." }, { status: 500 });
  }
}
