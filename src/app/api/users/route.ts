import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/users - Получить список всех пользователей
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireUser(request);
    
    // Проверяем, что пользователь - администратор
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Доступ запрещен" },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        totpSecret: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Не показываем наличие 2FA напрямую, только флаг
    const usersWithoutSecrets = users.map((user) => ({
      ...user,
      has2FA: !!(user.totpSecret && !user.totpSecret.startsWith("temp:")),
      totpSecret: undefined, // Не отправляем секрет
    }));

    return NextResponse.json({ users: usersWithoutSecrets });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Ошибка при получении списка пользователей" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users - Создать нового пользователя
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireUser(request);
    
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Доступ запрещен" },
        { status: 403 }
      );
    }

    const { email, name, password, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email и пароль обязательны" },
        { status: 400 }
      );
    }

    // Проверяем, не существует ли уже пользователь с таким email
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 400 }
      );
    }

    // Хешируем пароль
    const passwordHash = await hashPassword(password);

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        passwordHash,
        role: role || "admin",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Логируем создание пользователя
    await logAudit("settings_change", {
      userId: currentUser.id,
      details: { action: "user_created", targetUserId: user.id, targetEmail: user.email },
    });

    return NextResponse.json({ user, message: "Пользователь успешно создан" });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Ошибка при создании пользователя" },
      { status: 500 }
    );
  }
}

