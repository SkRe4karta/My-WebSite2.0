import { NextResponse } from "next/server";
import { prisma, ensureConnection } from "@/lib/db";

/**
 * Health check endpoint for monitoring and container orchestration
 * Returns 200 if application and database are healthy
 * Returns 503 if there are issues
 */
export async function GET() {
  const startTime = Date.now();
  const health: {
    status: "healthy" | "unhealthy";
    timestamp: string;
    uptime: number;
    services: {
      database: "ok" | "error";
      databaseResponseTime?: number;
    };
  } = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: "ok",
    },
  };

  try {
    // Check database connection
    const dbStartTime = Date.now();
    
    // Пробуем подключиться к БД с обработкой ошибок
    try {
      // Убеждаемся, что подключение установлено
      const connected = await ensureConnection();
      if (!connected) {
        // БД еще не создана - это нормально при первом запуске
        health.status = "unhealthy";
        health.services.database = "error";
        // Не логируем как ошибку
        console.log("ℹ️  Health check: БД еще не создана (это нормально при первом запуске)");
      } else {
        await prisma.$queryRaw`SELECT 1`;
        const dbResponseTime = Date.now() - dbStartTime;
        health.services.databaseResponseTime = dbResponseTime;

        // If database response time is too high, mark as unhealthy
        if (dbResponseTime > 5000) {
          health.status = "unhealthy";
          health.services.database = "error";
        }
      }
    } catch (dbError: any) {
      // Обрабатываем ошибки подключения к БД gracefully
      // Error code 14 означает, что файл БД не найден или недоступен
      if (dbError?.code === "P1001" || dbError?.message?.includes("Error code 14") || dbError?.message?.includes("Unable to open the database file")) {
        // БД еще не создана или недоступна - это нормально при первом запуске
        health.status = "unhealthy";
        health.services.database = "error";
        // Не логируем как ошибку, так как это ожидаемо при первом запуске
        console.log("ℹ️  Health check: БД еще не создана или недоступна (это нормально при первом запуске)");
      } else {
        // Другие ошибки БД
        health.status = "unhealthy";
        health.services.database = "error";
        console.error("Health check failed - database error:", dbError);
      }
    }
  } catch (error) {
    health.status = "unhealthy";
    health.services.database = "error";
    console.error("Health check failed - unexpected error:", error);
  }

  const responseTime = Date.now() - startTime;

  // Return appropriate status code
  if (health.status === "healthy") {
    return NextResponse.json(
      {
        ...health,
        responseTime,
      },
      { status: 200 }
    );
  } else {
    return NextResponse.json(
      {
        ...health,
        responseTime,
      },
      { status: 503 }
    );
  }
}

