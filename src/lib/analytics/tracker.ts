import { prisma } from "@/lib/db";

export async function trackActivity(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: any
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        metadata: metadata || {},
      },
    });
  } catch (error) {
    console.error("Failed to track activity:", error);
    // Не прерываем выполнение при ошибке трекинга
  }
}

