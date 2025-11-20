import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { backupDatabase, createFullBackup } from "@/lib/automation/backup";

// GET /api/backups - Получить все бэкапы
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const backups = await prisma.backup.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(backups);
  } catch (error) {
    console.error("Error fetching backups:", error);
    return NextResponse.json({ error: "Failed to fetch backups" }, { status: 500 });
  }
}

// POST /api/backups - Создать бэкап
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { type } = await request.json();

    // Создаем запись о бэкапе
    const backup = await prisma.backup.create({
      data: {
        type: type || "manual",
        status: "running",
        ownerId: user.id,
      },
    });

    // Запускаем бэкап асинхронно
    const backupType = type || "manual";
    createFullBackup({
      userId: user.id,
      type: backupType as any,
      includeDatabase: true,
      includeFiles: false,
      includeVault: false,
    }).then((result) => {
      if (!result.success) {
        prisma.backup.update({
          where: { id: backup.id },
          data: { status: "failed" },
        });
      }
    }).catch((error) => {
      console.error("Backup failed:", error);
      prisma.backup.update({
        where: { id: backup.id },
        data: { status: "failed" },
      });
    });

    return NextResponse.json(backup);
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json({ error: "Failed to create backup" }, { status: 500 });
  }
}

