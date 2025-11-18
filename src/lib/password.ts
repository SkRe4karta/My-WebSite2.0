import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Хеширует пароль с использованием bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Проверяет пароль против хеша
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Проверяет, является ли строка хешем bcrypt
 */
export function isBcryptHash(str: string): boolean {
  // Bcrypt хеши начинаются с $2a$, $2b$, $2x$ или $2y$ и имеют длину 60 символов
  return /^\$2[axyb]\$\d{2}\$/.test(str) && str.length === 60;
}

/**
 * Мигрирует старый пароль (plain text) в хеш
 */
export async function migratePassword(plainPassword: string): Promise<string> {
  return hashPassword(plainPassword);
}

