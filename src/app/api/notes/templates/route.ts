import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

// GET /api/notes/templates - Получить все шаблоны
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const templates = await prisma.noteTemplate.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// POST /api/notes/templates - Создать шаблон
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { name, content, description } = await request.json();

    if (!name || !content) {
      return NextResponse.json({ error: "Name and content are required" }, { status: 400 });
    }

    const template = await prisma.noteTemplate.create({
      data: {
        name,
        content,
        description,
        ownerId: user.id,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

