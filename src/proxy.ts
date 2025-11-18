import { NextResponse } from "next/server";
import { checkBruteForce, getClientIP } from "./lib/bruteforce";

export function proxy(request: Request) {
  // Защищаем только эндпоинты авторизации
  const url = new URL(request.url);
  
  if (url.pathname.startsWith("/api/auth/")) {
    // getClientIP принимает Request | Headers, передаем headers из Request
    const ip = getClientIP(request.headers);
    
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

