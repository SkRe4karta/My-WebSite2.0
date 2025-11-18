import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { assertRateLimit } from "@/lib/rate-limit";

export async function requireUser(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  const key = `${session.user.id}:${request.nextUrl.pathname}`;
  assertRateLimit(key, 60, 60_000);
  return session.user;
}
