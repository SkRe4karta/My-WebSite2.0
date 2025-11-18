import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

/**
 * POST /api/auth/2fa/disable - Отключить 2FA
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { password, token } = await request.json();

    // Проверяем пароль
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, totpSecret: true },
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

    // Если 2FA включен, проверяем TOTP код (кроме случая пересоздания)
    if (userData.totpSecret && !userData.totpSecret.startsWith("temp:")) {
      if (token === "RECREATE") {
        // Разрешаем пересоздание без проверки кода
      } else if (!token) {
        return NextResponse.json(
          { error: "Требуется код 2FA" },
          { status: 400 }
        );
      } else {
        const { verifyTOTP } = await import("@/lib/totp");
        const isValid = verifyTOTP(userData.totpSecret, token);

        if (!isValid) {
          return NextResponse.json(
            { error: "Неверный код 2FA" },
            { status: 400 }
          );
        }
      }
    }

    // Отключаем 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null },
    });

    // Удаляем резервные коды
    try {
      await prisma.userSetting.updateMany({
        where: { userId: user.id },
        data: { backupCodes: null } as any,
      });
    } catch (e) {
      // Игнорируем ошибку, если настройки не существуют
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    return NextResponse.json(
      { error: "Ошибка при отключении 2FA" },
      { status: 500 }
    );
  }
}

