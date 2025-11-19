import { prisma, ensureConnection } from "./db";

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "password_change"
  | "password_change_failed"
  | "2fa_enabled"
  | "2fa_disabled"
  | "2fa_failed"
  | "file_upload"
  | "file_delete"
  | "vault_access"
  | "note_create"
  | "note_update"
  | "note_delete"
  | "settings_change"
  | "export_data"
  | "backup_created"
  | "suspicious_activity";

export interface AuditDetails {
  [key: string]: any;
}

/**
 * Логирует действие в системе аудита
 */
export async function logAudit(
  action: AuditAction,
  options: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: AuditDetails;
  }
): Promise<void> {
  try {
    // Убеждаемся, что подключение к БД установлено
    const connected = await ensureConnection();
    if (!connected) {
      // БД еще не создана - просто пропускаем логирование
      // Это нормально при первом запуске
      return;
    }
    
    await prisma.securityAudit.create({
      data: {
        userId: options.userId || null,
        action,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
        details: options.details ? JSON.stringify(options.details) : null,
      },
    });
  } catch (error: any) {
    // Не прерываем выполнение при ошибке логирования
    // Не логируем ошибки подключения (Error code 14) как ошибки
    if (error?.message?.includes("Error code 14") || error?.message?.includes("Unable to open the database file")) {
      // Это нормально при первом запуске - БД еще не создана
      return;
    }
    console.error("Failed to log audit:", error);
  }
}

/**
 * Получает логи аудита для пользователя
 */
export async function getAuditLogs(
  userId?: string,
  options: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<any[]> {
  const where: any = {};

  if (userId) {
    where.userId = userId;
  }

  if (options.action) {
    where.action = options.action;
  }

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  // Убеждаемся, что подключение к БД установлено
  const connected = await ensureConnection();
  if (!connected) {
    // БД еще не создана - возвращаем пустой массив
    // Это нормально при первом запуске
    return [];
  }
  
  const logs = await prisma.securityAudit.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit || 100,
    skip: options.offset || 0,
  });

  return logs.map((log) => ({
    ...log,
    details: log.details ? JSON.parse(log.details) : null,
  }));
}

/**
 * Экспортирует логи аудита в JSON
 */
export async function exportAuditLogs(
  userId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<any[]> {
  return getAuditLogs(userId, {
    limit: 10000,
    startDate,
    endDate,
  });
}

