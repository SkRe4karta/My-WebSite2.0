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

// Создаем Prisma Client с обработкой ошибок подключения
// Используем ленивую инициализацию - не подключаемся к БД при создании
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // В production отключаем логирование ошибок, чтобы не засорять логи ошибками подключения
    // Ошибки подключения (Error code 14) обрабатываются через ensureConnection()
    log: process.env.NODE_ENV === "production" 
      ? [] // Не логируем ошибки в production - обрабатываем их вручную
      : ["query", "error", "warn"],
    // Отключаем автоматическое подключение при создании клиента
    // Подключение произойдет при первом запросе через ensureConnection()
  });

// Обработка ошибок подключения при первом использовании
let connectionAttempted = false;
let connectionError: Error | null = null;

// Функция для безопасного подключения к БД
// Не выбрасывает ошибку при Error code 14 (БД еще не создана)
export async function ensureConnection(): Promise<boolean> {
  // Всегда пробуем подключиться (БД могла быть создана между попытками)
  try {
    await prisma.$connect();
    connectionError = null;
    connectionAttempted = true;
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    connectionError = error instanceof Error ? error : new Error(errorMessage);
    connectionAttempted = true;
    
    // Не выбрасываем ошибку при Error code 14 - это нормально при первом запуске
    if (errorMessage.includes("Error code 14") || errorMessage.includes("Unable to open the database file")) {
      // Это нормально при первом запуске - БД еще не создана
      // Не логируем как ошибку, только как информационное сообщение
      // (логирование происходит только один раз при первом вызове)
      if (!connectionError.message.includes("logged")) {
        console.log("ℹ️  БД еще не создана (это нормально при первом запуске). Подключение будет повторено при первом запросе.");
        connectionError.message += " (logged)";
      }
      return false; // Возвращаем false, но не выбрасываем ошибку
    } else {
      // Другие ошибки логируем как предупреждение
      console.warn("⚠️  Предупреждение: не удалось подключиться к БД:", errorMessage);
      // Для других ошибок можно выбрасывать исключение, если нужно
      return false;
    }
  }
}

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
    // Убеждаемся, что подключение к БД установлено
    // Если БД еще не создана, ensureConnection вернет false, но не выбросит ошибку
    const connected = await ensureConnection();
    if (!connected) {
      // БД еще не создана - это нормально, просто возвращаем null
      // Пользователь будет создан позже, когда БД будет готова
      console.log("ℹ️  БД еще не создана, пропускаем создание администратора (будет создан позже)");
      return null as any;
    }
    
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
