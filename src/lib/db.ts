import { PrismaClient } from "@prisma/client";
import { hashPassword, isBcryptHash, verifyPassword } from "./password";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Валидация DATABASE_URL при инициализации
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ ОШИБКА: DATABASE_URL не установлен в переменных окружения");
  throw new Error("DATABASE_URL must be set in environment variables");
}

// Проверяем, что используется абсолютный путь для SQLite
if (databaseUrl.startsWith("file:") && databaseUrl.includes("./")) {
  console.warn("⚠️  ПРЕДУПРЕЖДЕНИЕ: DATABASE_URL использует относительный путь");
  console.warn(`   Текущий путь: ${databaseUrl}`);
  console.warn("   Рекомендуется использовать абсолютный путь: file:/app/database/db.sqlite");
  console.warn("   Это может привести к ошибкам подключения к БД в Docker контейнере");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL ?? "zelyonkin.d@gmail.com";
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  
  if (!passwordHash) {
    console.error("❌ ОШИБКА: ADMIN_PASSWORD_HASH не найден в переменных окружения");
    console.error("   Проверьте:");
    console.error("   1. Файл .env существует в корне проекта");
    console.error("   2. В .env есть строка: ADMIN_PASSWORD_HASH=...");
    console.error("   3. Dev-сервер перезапущен после создания/изменения .env");
    throw new Error("ADMIN_PASSWORD_HASH должен быть задан в .env файле. Перезапустите dev-сервер после создания .env");
  }

  // Используем ADMIN_USERNAME как name для входа по логину
  const name = process.env.ADMIN_NAME ?? process.env.ADMIN_USERNAME ?? "skre4karta";
  const username = process.env.ADMIN_USERNAME ?? "skre4karta";

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    
    if (!existing) {
      console.log("Creating new admin user with email:", email);
      // Используем хеш напрямую из .env
      return await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: passwordHash,
          role: "admin",
        },
      });
    }

    // Проверяем, нужно ли мигрировать пароль (если он не хеширован)
    const needsMigration = !isBcryptHash(existing.passwordHash);
    
    // Проверяем, изменился ли пароль
    let passwordChanged = false;
    if (needsMigration) {
      // Старый пароль хранился в plain text - обновляем на хеш из .env
      passwordChanged = true;
    } else {
      // Пароль хеширован, проверяем, изменился ли хеш
      passwordChanged = existing.passwordHash !== passwordHash;
    }

    if (passwordChanged || needsMigration) {
      console.log("🔄 Обновление пароля в БД из .env");
      const updated = await prisma.user.update({
        where: { email },
        data: { passwordHash: passwordHash, name, role: "admin" },
      });
      console.log("   ✅ Пароль обновлён в БД");
      return updated;
    }

    console.log("✅ Admin user exists");
    return existing;
  } catch (error) {
    console.error("Error ensuring admin user:", error);
    throw error;
  }
}
