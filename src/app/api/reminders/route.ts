import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

// GET /api/reminders - Получить все напоминания
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const searchParams = request.nextUrl.searchParams;
    const completed = searchParams.get("completed");

    const where: any = { ownerId: user.id };
    if (completed !== null) {
      where.completed = completed === "true";
    }

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { triggerAt: "asc" },
    });

    return NextResponse.json(reminders);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}

// POST /api/reminders - Создать напоминание
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { taskId, noteId, message, triggerAt } = await request.json();

    if (!message || !triggerAt) {
      return NextResponse.json({ error: "Message and triggerAt are required" }, { status: 400 });
    }

    const reminder = await prisma.reminder.create({
      data: {
        taskId,
        noteId,
        message,
        triggerAt: new Date(triggerAt),
        ownerId: user.id,
      },
    });

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("Error creating reminder:", error);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}

