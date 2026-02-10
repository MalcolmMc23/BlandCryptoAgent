import { NextResponse } from "next/server";

import { isDbUnavailableError, pool } from "@/lib/db";
import { demoLookupUser } from "@/lib/demoStore";
import { normalizeUsername } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params;
  const username = normalizeUsername(rawUsername);

  try {
    const result = await pool.query<{ id: string; username: string }>(
      `SELECT id, username FROM users WHERE username = $1 LIMIT 1`,
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: true, user });
  } catch (error) {
    if (isDbUnavailableError(error)) {
      return NextResponse.json(demoLookupUser(username));
    }
    const message = error instanceof Error ? error.message : "Lookup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
