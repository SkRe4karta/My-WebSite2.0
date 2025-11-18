import NextAuth from "next-auth/next";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { AdapterUser } from "next-auth/adapters";
import type { Session, NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { ensureAdminUser, prisma } from "./db";
import { checkBruteForce, recordFailedAttempt, resetFailedAttempts, getClientIP } from "./bruteforce";
import { logAudit } from "./audit";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "zelyonkin.d@gmail.com";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "skre4karta";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Логин", type: "text", value: ADMIN_USERNAME },
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

          if (credentials.username !== ADMIN_USERNAME) {
            console.error(`Invalid username: ${credentials.username}, expected: ${ADMIN_USERNAME}`);
            recordFailedAttempt(clientIP);
            await logAudit("login_failed", {
              ipAddress: clientIP,
              userAgent,
              details: { reason: "invalid_username", attemptedUsername: credentials.username },
            });
            throw new Error("Неверный логин");
          }

          const admin = await ensureAdminUser();
          if (!admin) {
            console.error("Admin user not found");
            recordFailedAttempt(clientIP);
            throw new Error("Пользователь не найден");
          }

          const enteredPassword = credentials.password?.trim();
          
          if (!enteredPassword) {
            recordFailedAttempt(clientIP);
            throw new Error("Введите пароль");
          }

          // Проверяем пароль через bcrypt
          const { verifyPassword, isBcryptHash, hashPassword } = await import("./password");
          
          let passwordValid = false;
          
          // Проверяем, хеширован ли пароль в БД
          if (isBcryptHash(admin.passwordHash)) {
            // Пароль хеширован, используем bcrypt для проверки
            passwordValid = await verifyPassword(enteredPassword, admin.passwordHash);
          } else {
            // Старый формат (plain text) - для обратной совместимости
            // Мигрируем пароль в хеш при следующем входе
            passwordValid = enteredPassword === admin.passwordHash;
            
            // Если пароль верный, мигрируем его в хеш
            if (passwordValid) {
              const hashedPassword = await hashPassword(enteredPassword);
              await prisma.user.update({
                where: { id: admin.id },
                data: { passwordHash: hashedPassword },
              });
              console.log("✅ Пароль мигрирован в хеш");
            }
          }
          
          console.log("🔐 Проверка пароля:", passwordValid ? "✅ Успешно" : "❌ Неверный пароль");
          
          if (!passwordValid) {
            console.error("❌ Invalid password");
            recordFailedAttempt(clientIP);
            await logAudit("login_failed", {
              userId: admin.id,
              ipAddress: clientIP,
              userAgent,
              details: { reason: "invalid_password" },
            });
            throw new Error("Неверный пароль");
          }

          // Проверяем 2FA, если включен
          if (admin.totpSecret && !admin.totpSecret.startsWith("temp:")) {
            const totpCode = (credentials as any).totpCode;
            
            if (!totpCode) {
              // Возвращаем специальную ошибку, чтобы показать поле для 2FA
              throw new Error("2FA_REQUIRED");
            }

            // Проверяем TOTP код
            const { verifyTOTP } = await import("./totp");
            const isValid = verifyTOTP(admin.totpSecret, totpCode);

            // Если TOTP неверен, проверяем резервные коды
            if (!isValid) {
              const settings = await prisma.userSetting.findUnique({
                where: { userId: admin.id },
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
                      where: { userId: admin.id },
                      data: { backupCodes: JSON.stringify(backupCodes) } as any,
                    });
                  } else {
                    recordFailedAttempt(clientIP);
                    await logAudit("login_failed", {
                      userId: admin.id,
                      ipAddress: clientIP,
                      userAgent,
                      details: { reason: "invalid_2fa_code_or_backup" },
                    });
                    throw new Error("Неверный код 2FA");
                  }
                } catch {
                  recordFailedAttempt(clientIP);
                  await logAudit("login_failed", {
                    userId: admin.id,
                    ipAddress: clientIP,
                    userAgent,
                    details: { reason: "invalid_2fa_code_or_backup_parse_error" },
                  });
                  throw new Error("Неверный код 2FA");
                }
              } else {
                recordFailedAttempt(clientIP);
                await logAudit("login_failed", {
                  userId: admin.id,
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
            userId: admin.id,
            ipAddress: clientIP,
            userAgent,
            details: { has2FA: !!(admin.totpSecret && !admin.totpSecret.startsWith("temp:")) },
          });

          return {
            id: admin.id,
            email: admin.email,
            name: admin.name ?? ADMIN_USERNAME,
            role: admin.role,
          };
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
        session.user = {
          ...(session.user ?? {}),
          id: token.id as string,
          role: (token.role as string) ?? "admin",
          email: (token as JWT & { email?: string }).email ?? session.user?.email ?? ADMIN_EMAIL,
          name: ADMIN_USERNAME,
        };
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
};

export const { handlers: authHandlers, auth, signIn, signOut } = NextAuth(authOptions);
