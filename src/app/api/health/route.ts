import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
    await prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - dbStartTime;
    health.services.databaseResponseTime = dbResponseTime;

    // If database response time is too high, mark as unhealthy
    if (dbResponseTime > 5000) {
      health.status = "unhealthy";
      health.services.database = "error";
    }
  } catch (error) {
    health.status = "unhealthy";
    health.services.database = "error";
    console.error("Health check failed - database error:", error);
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

