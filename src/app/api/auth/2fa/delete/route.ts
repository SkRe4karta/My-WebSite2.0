import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

/**
 * POST /api/auth/2fa/delete - Полностью удалить 2FA
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Требуется пароль" },
        { status: 400 }
      );
    }

    // Получаем данные пользователя для проверки пароля
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!userData) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Проверяем пароль через bcrypt
    const { verifyPassword, isBcryptHash } = await import("@/lib/password");
    let passwordValid = false;
    
    if (isBcryptHash(userData.passwordHash)) {
      passwordValid = await verifyPassword(password, userData.passwordHash);
    } else {
      // Старый формат (plain text) - для обратной совместимости
      passwordValid = password === userData.passwordHash;
    }
    
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Неверный пароль" },
        { status: 400 }
      );
    }

    // Полностью удаляем 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null },
    });

    // Удаляем резервные коды
    try {
      await prisma.userSetting.update({
        where: { userId: user.id },
        data: { backupCodes: null } as any,
      });
    } catch (e) {
      // Игнорируем ошибку, если настройки не существуют
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting 2FA:", error);
    return NextResponse.json(
      { error: "Ошибка при удалении 2FA" },
      { status: 500 }
    );
  }
}

