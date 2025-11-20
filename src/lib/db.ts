import { PrismaClient } from "@prisma/client";
import { hashPassword, isBcryptHash, verifyPassword } from "./password";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Валидация DATABASE_URL при инициализации
// Не бросаем ошибку при сборке - только при реальном использовании
let databaseUrl = process.env.DATABASE_URL;

// Определяем, находимся ли мы в режиме сборки
// Проверяем различные признаки режима сборки Next.js
const isBuildPhase = 
  process.env.NEXT_PHASE === "phase-production-build" || 
  process.env.NEXT_PHASE === "phase-development-build" ||
  process.env.__NEXT_PRIVATE_PREBUNDLED_REACT !== undefined ||
  (typeof process.env.NEXT_RUNTIME === "undefined" && 
   process.env.NODE_ENV === "production" &&
   !process.env.PORT);

// Определяем dev режим
const isDevMode = process.env.NODE_ENV === "development" || process.env.NODE_ENV !== "production";

// Если DATABASE_URL не установлен
if (!databaseUrl) {
  if (isBuildPhase) {
    // Во время сборки используем временный PostgreSQL URL
    // Это нужно для статической генерации страниц
    databaseUrl = "postgresql://user:password@localhost:5432/build_db?schema=public";
    process.env.DATABASE_URL = databaseUrl;
  } else if (isDevMode) {
    // В dev режиме используем временный URL, но выводим предупреждение
    // Ошибка будет выброшена только при реальном использовании БД
    databaseUrl = "postgresql://user:password@localhost:5432/mywebsite?schema=public";
    process.env.DATABASE_URL = databaseUrl;
    console.warn("⚠️  DATABASE_URL не установлен. Используется временный URL для dev режима.");
    console.warn("   Создайте файл .env с DATABASE_URL для подключения к реальной БД.");
  } else {
    // В production выбрасываем ошибку
    throw new Error(
      "DATABASE_URL не установлен. Установите переменную окружения DATABASE_URL с PostgreSQL connection string.\n" +
      "Пример: postgresql://user:password@localhost:5432/mywebsite?schema=public"
    );
  }
}

// Проверяем, что используется PostgreSQL (только если URL установлен)
if (databaseUrl && !databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
  throw new Error(
    "DATABASE_URL должен использовать PostgreSQL. " +
    "SQLite больше не поддерживается. " +
    `Текущий URL: ${databaseUrl.substring(0, 30)}...`
  );
}

// Используем databaseUrl для Prisma Client
const dbUrl = databaseUrl;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
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
    
    // Обработка ошибок подключения PostgreSQL
    if (errorMessage.includes("P1001") || 
        errorMessage.includes("Can't reach database server") ||
        errorMessage.includes("Connection refused") ||
        errorMessage.includes("timeout")) {
      // База данных недоступна
      if (!connectionError.message.includes("logged")) {
        if (isDevMode) {
          console.error("❌ ОШИБКА: База данных PostgreSQL недоступна!");
          console.error("   Для работы в dev режиме:");
          console.error("   1. Установите PostgreSQL локально или используйте Docker");
          console.error("   2. Создайте файл .env в корне проекта");
          console.error("   3. Добавьте в .env: DATABASE_URL=\"postgresql://user:password@localhost:5432/mywebsite?schema=public\"");
          console.error("   4. Или используйте Docker Compose: docker-compose up -d postgres");
        } else {
          console.log("ℹ️  База данных PostgreSQL недоступна. Убедитесь, что PostgreSQL запущен и доступен.");
        }
        connectionError.message += " (logged)";
      }
      return false;
    } else {
      // Другие ошибки логируем как предупреждение
      if (isDevMode) {
        console.error("❌ ОШИБКА подключения к БД:", errorMessage);
      } else {
        console.warn("⚠️  Предупреждение: не удалось подключиться к БД:", errorMessage);
      }
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
