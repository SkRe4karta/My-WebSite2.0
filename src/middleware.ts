import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkBruteForce, getClientIP } from "./lib/bruteforce";

export function middleware(request: NextRequest) {
  // Защищаем только эндпоинты авторизации
  if (request.nextUrl.pathname.startsWith("/api/auth/")) {
    const ip = getClientIP(request);
    
    try {
      checkBruteForce(ip);
    } catch (error) {
      // IP заблокирован
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "IP заблокирован" },
        { status: 429 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/auth/:path*",
};

