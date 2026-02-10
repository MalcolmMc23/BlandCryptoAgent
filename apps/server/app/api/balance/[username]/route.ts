import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { normalizeUsername } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params;
  const username = normalizeUsername(rawUsername);

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      account: {
        select: {
          usdBalanceCents: true
        }
      },
      holdings: {
        select: {
          symbol: true,
          amount: true
        },
        where: {
          amount: {
            gt: 0
          }
        },
        orderBy: { symbol: "asc" }
      }
    }
  });

  if (!user || !user.account) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    username: user.username,
    usd_balance_cents: user.account.usdBalanceCents,
    holdings: user.holdings.map((h) => ({
      symbol: h.symbol,
      amount: h.amount.toString()
    }))
  });
}
