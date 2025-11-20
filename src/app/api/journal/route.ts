import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { ideaPayload } from "@/lib/validators";
import { trackActivity } from "@/lib/analytics/tracker";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  const month = request.nextUrl.searchParams.get("month");
  const where: Prisma.IdeaEntryWhereInput = { ownerId: user.id };
  if (month) {
    const [year, m] = month.split("-").map(Number);
    if (!Number.isNaN(year) && !Number.isNaN(m)) {
      const start = new Date(Date.UTC(year, m - 1, 1));
      const end = new Date(Date.UTC(year, m, 0, 23, 59, 59));
      where.date = { gte: start, lte: end };
    }
  }
  const ideas = await prisma.ideaEntry.findMany({ where, orderBy: { date: "asc" } });
  return NextResponse.json(ideas);
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  const payload = ideaPayload.parse(await request.json());
  const idea = await prisma.ideaEntry.create({
    data: {
      title: payload.title,
      content: payload.content,
      mood: payload.mood,
      category: payload.category,
      tags: payload.tags,
      date: new Date(payload.date),
      ownerId: user.id,
    },
  });
  
  // Трекинг активности
  await trackActivity(user.id, "journal_entry_created", "journal", idea.id);
  
  return NextResponse.json(idea, { status: 201 });
}
