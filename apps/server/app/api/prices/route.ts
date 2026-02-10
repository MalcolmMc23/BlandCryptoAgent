import { NextResponse } from "next/server";

import { FAKE_PRICES_USD } from "@/lib/prices";

export async function GET() {
  return NextResponse.json({
    prices: FAKE_PRICES_USD,
    timestamp: new Date().toISOString(),
    is_fake: true
  });
}
