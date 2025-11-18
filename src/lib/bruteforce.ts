type FailedAttempt = {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil?: number;
};

const failedAttempts = new Map<string, FailedAttempt>();

// Настройки защиты от брутфорса
const MAX_ATTEMPTS = 5; // Максимум попыток
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 минут блокировки
const WINDOW_MS = 60 * 60 * 1000; // Окно в 1 час для подсчёта попыток

/**
 * Получает IP адрес из запроса или Headers
 */
export function getClientIP(request: Request | Headers): string {
  const headers = request instanceof Headers ? request : request.headers;
  
  // Пробуем получить IP из заголовков (для прокси/nginx)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIP = headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  
  // Fallback (в production это не должно использоваться)
  return "unknown";
}

/**
 * Проверяет, заблокирован ли IP
 */
export function isIPBlocked(ip: string): boolean {
  const attempt = failedAttempts.get(ip);
  if (!attempt || !attempt.blockedUntil) {
    return false;
  }
  
  if (attempt.blockedUntil > Date.now()) {
    return true;
  }
  
  // Блокировка истекла, очищаем
  failedAttempts.delete(ip);
  return false;
}

/**
 * Получает время до разблокировки в секундах
 */
export function getUnlockTime(ip: string): number {
  const attempt = failedAttempts.get(ip);
  if (!attempt || !attempt.blockedUntil) {
    return 0;
  }
  
  const remaining = attempt.blockedUntil - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

/**
 * Регистрирует неудачную попытку входа
 */
export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const attempt = failedAttempts.get(ip);
  
  if (!attempt) {
    failedAttempts.set(ip, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return;
  }
  
  // Если прошло больше часа с первой попытки, сбрасываем счётчик
  if (now - attempt.firstAttempt > WINDOW_MS) {
    attempt.count = 1;
    attempt.firstAttempt = now;
    attempt.lastAttempt = now;
    attempt.blockedUntil = undefined;
    return;
  }
  
  attempt.count += 1;
  attempt.lastAttempt = now;
  
  // Если превышен лимит, блокируем IP
  if (attempt.count >= MAX_ATTEMPTS) {
    attempt.blockedUntil = now + LOCKOUT_DURATION;
    console.warn(`🚫 IP ${ip} заблокирован на ${LOCKOUT_DURATION / 1000 / 60} минут после ${attempt.count} неудачных попыток`);
  }
}

/**
 * Сбрасывает счётчик неудачных попыток (при успешном входе)
 */
export function resetFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

/**
 * Проверяет и блокирует IP при необходимости
 */
export function checkBruteForce(ip: string): void {
  if (isIPBlocked(ip)) {
    const unlockTime = getUnlockTime(ip);
    throw new Error(`IP заблокирован. Попробуйте через ${Math.ceil(unlockTime / 60)} минут.`);
  }
}

/**
 * Очищает старые записи (для предотвращения утечки памяти)
 */
export function cleanupOldAttempts(): void {
  const now = Date.now();
  for (const [ip, attempt] of failedAttempts.entries()) {
    // Удаляем записи старше 2 часов
    if (now - attempt.lastAttempt > 2 * WINDOW_MS) {
      failedAttempts.delete(ip);
    }
  }
}

// Периодическая очистка каждые 30 минут
if (typeof setInterval !== "undefined") {
  setInterval(cleanupOldAttempts, 30 * 60 * 1000);
}

