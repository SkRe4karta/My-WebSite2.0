import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

/**
 * GET /api/auth/2fa/status - Проверить статус 2FA
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totpSecret: true },
    });

    const enabled = !!userData?.totpSecret && !userData.totpSecret.startsWith("temp:");

    return NextResponse.json({ enabled });
  } catch (error) {
    console.error("Error checking 2FA status:", error);
    return NextResponse.json(
      { error: "Ошибка при проверке статуса 2FA" },
      { status: 500 }
    );
  }
}

