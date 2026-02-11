import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone")?.trim();

  if (!phone) {
    return NextResponse.json(
      { error: "Query param 'phone' is required." },
      { status: 400 }
    );
  }

  const result = await pool.query<{
    id: string;
    username: string;
    phone_number: string;
  }>(
    `SELECT id, username, phone_number FROM users WHERE phone_number = $1 LIMIT 1`,
    [phone]
  );

  const user = result.rows[0];

  if (!user) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({ exists: true, user });
}
