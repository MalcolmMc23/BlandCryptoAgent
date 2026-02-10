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
    select: { id: true, username: true }
  });

  if (!user) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    user
  });
}
