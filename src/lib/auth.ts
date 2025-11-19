import NextAuth from "next-auth/next";
import Credentials from "next-auth/providers/credentials";
// PrismaAdapter не используется при JWT strategy
// import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AdapterUser } from "next-auth/adapters";
import type { Session, NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { ensureAdminUser, prisma } from "./db";
import { checkBruteForce, recordFailedAttempt, resetFailedAttempts, getClientIP } from "./bruteforce";
import { logAudit } from "./audit";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "zelyonkin.d@gmail.com";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "skre4karta";

export const authOptions: NextAuthOptions = {
  // Не используем PrismaAdapter при JWT strategy - он нужен только для database sessions
  // adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 дней
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Логин или Email", type: "text", placeholder: "Введите логин или email" },
        password: { label: "Пароль", type: "password" },
        totpCode: { label: "Код 2FA", type: "text" },
      },
      async authorize(credentials, request) {
        try {
          // Получаем IP из request (если доступен)
          let clientIP = "unknown";
          let userAgent = "unknown";
          
          try {
            if (request && typeof request === "object" && "headers" in request) {
              const headers = request.headers;
              if (headers && typeof headers.get === "function") {
                clientIP = getClientIP(headers as Headers);
                userAgent = headers.get("user-agent") || "unknown";
              }
            }
          } catch (error) {
            console.warn("Failed to get client IP/User-Agent:", error);
          }

          if (!credentials?.username || !credentials?.password) {
            console.error("Missing credentials");
            recordFailedAttempt(clientIP);
            await logAudit("login_failed", {
              ipAddress: clientIP,
              userAgent,
              details: { reason: "missing_credentials" },
            });
            throw new Error("Введите логин и пароль");
          }

          // Ищем пользователя по email или name (username может быть любым из них)
          const usernameOrEmail = credentials.username.trim();
          console.log(`🔍 Поиск пользователя: "${usernameOrEmail}"`);
          
          // Убеждаемся, что подключение к БД установлено
          const { ensureConnection } = await import("./db");
          const connected = await ensureConnection();
          if (!connected) {
            // БД еще не создана - это нормально при первом запуске
            // Выбрасываем ошибку, чтобы пользователь понял, что нужно подождать
            throw new Error("База данных еще не создана. Пожалуйста, подождите, пока завершится установка.");
          }
          
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { email: usernameOrEmail },
                { name: usernameOrEmail },
              ],
            },
          });

          if (!user) {
            console.error(`❌ User not found: ${usernameOrEmail}`);
            // Выводим список всех пользователей для отладки
            const allUsers = await prisma.user.findMany({
              select: { email: true, name: true },
            });
            console.log(`📋 Доступные пользователи:`, allUsers);
            recordFailedAttempt(clientIP);
            await logAudit("login_failed", {
              ipAddress: clientIP,
              userAgent,
              details: { reason: "invalid_username", attemptedUsername: usernameOrEmail },
            });
            throw new Error("Неверный логин или пользователь не найден");
          }

          console.log(`✅ Пользователь найден: ${user.email} (name: ${user.name || 'не задано'})`);

          const enteredPassword = credentials.password?.trim();
          
          if (!enteredPassword) {
            recordFailedAttempt(clientIP);
            throw new Error("Введите пароль");
          }

          // Проверяем пароль через bcrypt
          const { verifyPassword, isBcryptHash, hashPassword } = await import("./password");
          
          let passwordValid = false;
          
          // Проверяем, хеширован ли пароль в БД
          if (isBcryptHash(user.passwordHash)) {
            // Пароль хеширован, используем bcrypt для проверки
            passwordValid = await verifyPassword(enteredPassword, user.passwordHash);
          } else {
            // Старый формат (plain text) - для обратной совместимости
            // Мигрируем пароль в хеш при следующем входе
            passwordValid = enteredPassword === user.passwordHash;
            
            // Если пароль верный, мигрируем его в хеш
            if (passwordValid) {
              const hashedPassword = await hashPassword(enteredPassword);
              await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: hashedPassword },
              });
              console.log("✅ Пароль мигрирован в хеш");
            }
          }
          
          console.log("🔐 Проверка пароля:", passwordValid ? "✅ Успешно" : "❌ Неверный пароль");
          
          if (!passwordValid) {
            console.error("❌ Invalid password");
            console.error(`   Введенный пароль: "${enteredPassword}"`);
            console.error(`   Хеш в БД: ${user.passwordHash.substring(0, 20)}...`);
            console.error(`   Хеш bcrypt: ${isBcryptHash(user.passwordHash) ? 'Да' : 'Нет'}`);
            recordFailedAttempt(clientIP);
            await logAudit("login_failed", {
              userId: user.id,
              ipAddress: clientIP,
              userAgent,
              details: { reason: "invalid_password" },
            });
            throw new Error("Неверный пароль");
          }

          // Проверяем 2FA, если включен
          if (user.totpSecret && !user.totpSecret.startsWith("temp:")) {
            const totpCode = (credentials as any).totpCode;
            
            if (!totpCode) {
              // Возвращаем специальную ошибку, чтобы показать поле для 2FA
              throw new Error("2FA_REQUIRED");
            }

            // Проверяем TOTP код
            const { verifyTOTP } = await import("./totp");
            const isValid = verifyTOTP(user.totpSecret, totpCode);

            // Если TOTP неверен, проверяем резервные коды
            if (!isValid) {
              const settings = await prisma.userSetting.findUnique({
                where: { userId: user.id },
              });

              // Используем type assertion, так как Prisma Client может быть не обновлён
              const backupCodesJson = (settings as any)?.backupCodes as string | null | undefined;

              if (backupCodesJson) {
                try {
                  const backupCodes = JSON.parse(backupCodesJson) as string[];
                  const codeIndex = backupCodes.indexOf(totpCode);
                  
                  if (codeIndex !== -1) {
                    // Удаляем использованный резервный код
                    backupCodes.splice(codeIndex, 1);
                    await prisma.userSetting.update({
                      where: { userId: user.id },
                      data: { backupCodes: JSON.stringify(backupCodes) } as any,
                    });
                  } else {
                    recordFailedAttempt(clientIP);
                    await logAudit("login_failed", {
                      userId: user.id,
                      ipAddress: clientIP,
                      userAgent,
                      details: { reason: "invalid_2fa_code_or_backup" },
                    });
                    throw new Error("Неверный код 2FA");
                  }
                } catch {
                  recordFailedAttempt(clientIP);
                  await logAudit("login_failed", {
                    userId: user.id,
                    ipAddress: clientIP,
                    userAgent,
                    details: { reason: "invalid_2fa_code_or_backup_parse_error" },
                  });
                  throw new Error("Неверный код 2FA");
                }
              } else {
                recordFailedAttempt(clientIP);
                await logAudit("login_failed", {
                  userId: user.id,
                  ipAddress: clientIP,
                  userAgent,
                  details: { reason: "invalid_2fa_code_no_backup_codes" },
                });
                throw new Error("Неверный код 2FA");
              }
            }
          }

          // Успешный вход - сбрасываем счётчик неудачных попыток
          resetFailedAttempts(clientIP);
          
          // Логируем успешный вход
          await logAudit("login", {
            userId: user.id,
            ipAddress: clientIP,
            userAgent,
            details: { has2FA: !!(user.totpSecret && !user.totpSecret.startsWith("temp:")) },
          });

          const userData = {
            id: user.id,
            email: user.email,
            name: user.name ?? user.email,
            role: user.role,
          };
          
          console.log(`✅ Авторизация успешна:`, {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
          });
          
          return userData;
        } catch (error) {
          console.error("Authorization error:", error);
          if (error instanceof Error) {
            throw error;
          }
          throw new Error("Ошибка авторизации");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: AdapterUser | null }) {
      if (user) {
        token.id = user.id;
        token.role = (user as AdapterUser & { role?: string }).role ?? "admin";
        token.email = user.email ?? token.email;
        (token as JWT & { username?: string }).username = ADMIN_USERNAME;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token?.id) {
        // Получаем актуальные данные пользователя из БД
        try {
          // Убеждаемся, что подключение к БД установлено
          const { ensureConnection } = await import("./db");
          const connected = await ensureConnection();
          if (!connected) {
            // БД недоступна - используем данные из токена
            // Это нормально при первом запуске
            console.log("ℹ️  БД недоступна в session callback, используем данные из токена");
          }
          
          const user = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { email: true, name: true, role: true },
          });
          
          if (user) {
            session.user = {
              ...(session.user ?? {}),
              id: token.id as string,
              role: user.role ?? "admin",
              email: user.email,
              name: user.name ?? user.email,
            };
          } else {
            // Fallback на старые данные из token
            session.user = {
              ...(session.user ?? {}),
              id: token.id as string,
              role: (token.role as string) ?? "admin",
              email: (token as JWT & { email?: string }).email ?? session.user?.email ?? ADMIN_EMAIL,
              name: (token as JWT & { username?: string }).username ?? ADMIN_USERNAME,
            };
          }
        } catch (error) {
          console.error("Error fetching user in session callback:", error);
          // Fallback на данные из token
          session.user = {
            ...(session.user ?? {}),
            id: token.id as string,
            role: (token.role as string) ?? "admin",
            email: (token as JWT & { email?: string }).email ?? session.user?.email ?? ADMIN_EMAIL,
            name: (token as JWT & { username?: string }).username ?? ADMIN_USERNAME,
          };
        }
      }
      return session;
    },
  },
  events: {
    async signOut({ token }: { token?: JWT }) {
      if (token?.id) {
        await logAudit("logout", {
          userId: token.id as string,
        });
      }
    },
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  // Исправляем URL для работы через прокси
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token" 
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
      },
    },
  },
};

export const { handlers: authHandlers, auth, signIn, signOut } = NextAuth(authOptions);
