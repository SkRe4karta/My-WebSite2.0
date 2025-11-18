import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword, isBcryptHash } from "@/lib/password";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/auth/change-password - Изменить пароль пользователя
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { oldPassword, newPassword, confirmPassword } = await request.json();

    // Валидация
    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Все поля обязательны для заполнения" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Новый пароль и подтверждение не совпадают" },
        { status: 400 }
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "Новый пароль должен содержать минимум 4 символа" },
        { status: 400 }
      );
    }

    // Получаем данные пользователя
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

    // Проверяем старый пароль
    let oldPasswordValid = false;
    
    if (isBcryptHash(userData.passwordHash)) {
      oldPasswordValid = await verifyPassword(oldPassword, userData.passwordHash);
    } else {
      // Старый формат (plain text) - для обратной совместимости
      oldPasswordValid = oldPassword === userData.passwordHash;
    }

    if (!oldPasswordValid) {
      await logAudit("password_change_failed", {
        userId: user.id,
        details: { reason: "invalid_old_password" },
      });
      return NextResponse.json(
        { error: "Неверный текущий пароль" },
        { status: 400 }
      );
    }

    // Хешируем новый пароль
    const newPasswordHash = await hashPassword(newPassword);

    // Обновляем пароль в БД
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Логируем успешную смену пароля
    await logAudit("password_changed", {
      userId: user.id,
    });

    return NextResponse.json({ success: true, message: "Пароль успешно изменён" });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Ошибка при изменении пароля" },
      { status: 500 }
    );
  }
}

