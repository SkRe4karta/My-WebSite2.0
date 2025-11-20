import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "week"; // day, week, month

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "day":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Статистика по заметкам
    const notesCount = await prisma.note.count({
      where: {
        ownerId: user.id,
        createdAt: { gte: startDate },
      },
    });

    // Статистика по файлам
    const filesCount = await prisma.fileEntry.count({
      where: {
        ownerId: user.id,
        createdAt: { gte: startDate },
      },
    });

    // Статистика по vault
    const vaultCount = await prisma.vaultItem.count({
      where: {
        ownerId: user.id,
        createdAt: { gte: startDate },
      },
    });

    // Статистика активности
    const activityCount = await prisma.activityLog.count({
      where: {
        userId: user.id,
        createdAt: { gte: startDate },
      },
    });

    // Активность по дням
    const dailyActivity = await prisma.activityLog.groupBy({
      by: ["createdAt"],
      where: {
        userId: user.id,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    return NextResponse.json({
      notes: notesCount,
      files: filesCount,
      vault: vaultCount,
      activity: activityCount,
      dailyActivity: dailyActivity.map((item) => ({
        date: item.createdAt,
        count: item._count,
      })),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}

