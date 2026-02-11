import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { normalizeUsername } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params;
  const username = normalizeUsername(rawUsername);

  const result = await pool.query<{ id: string; username: string; phone_number: string | null }>(
    `SELECT id, username, phone_number FROM users WHERE username = $1 LIMIT 1`,
    [username]
  );

  const user = result.rows[0];

  if (!user) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({ exists: true, user });
}
