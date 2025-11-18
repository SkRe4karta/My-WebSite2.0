import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, isBcryptHash } from "@/lib/password";
import { logAudit } from "@/lib/audit";

/**
 * PUT /api/users/[id] - Обновить пользователя
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireUser(request);
    const { id } = await params;
    
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Доступ запрещен" },
        { status: 403 }
      );
    }

    const { email, name, password, role } = await request.json();

    // Проверяем, существует ли пользователь
    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Если меняется email, проверяем уникальность
    if (email && email !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Пользователь с таким email уже существует" },
          { status: 400 }
        );
      }
    }

    // Подготавливаем данные для обновления
    const updateData: any = {};
    if (email) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (role) updateData.role = role;

    // Если указан новый пароль, хешируем его
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    // Обновляем пользователя
    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    // Логируем обновление
    await logAudit("settings_change", {
      userId: currentUser.id,
      details: { 
        action: "user_updated", 
        targetUserId: id,
        changes: Object.keys(updateData),
      },
    });

    return NextResponse.json({ user: updated, message: "Пользователь успешно обновлен" });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Ошибка при обновлении пользователя" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id] - Удалить пользователя
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireUser(request);
    const { id } = await params;
    
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Доступ запрещен" },
        { status: 403 }
      );
    }

    // Нельзя удалить самого себя
    if (currentUser.id === id) {
      return NextResponse.json(
        { error: "Нельзя удалить самого себя" },
        { status: 400 }
      );
    }

    // Проверяем, существует ли пользователь
    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Удаляем пользователя (каскадное удаление настроек и других данных)
    await prisma.user.delete({
      where: { id },
    });

    // Логируем удаление
    await logAudit("settings_change", {
      userId: currentUser.id,
      details: { 
        action: "user_deleted", 
        targetUserId: id,
        targetEmail: existing.email,
      },
    });

    return NextResponse.json({ message: "Пользователь успешно удален" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Ошибка при удалении пользователя" },
      { status: 500 }
    );
  }
}

