import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

// GET /api/notes/[id]/versions - Получить все версии заметки
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    
    // Проверяем доступ к заметке
    const note = await prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.ownerId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const versions = await prisma.noteVersion.findMany({
      where: { noteId: id },
      orderBy: { version: "desc" },
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error("Error fetching note versions:", error);
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
  }
}

// POST /api/notes/[id]/versions - Создать новую версию
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    
    const note = await prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.ownerId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Получаем последнюю версию
    const lastVersion = await prisma.noteVersion.findFirst({
      where: { noteId: id },
      orderBy: { version: "desc" },
    });

    const nextVersion = (lastVersion?.version || 0) + 1;

    // Создаем версию с текущим содержимым заметки
    const version = await prisma.noteVersion.create({
      data: {
        noteId: id,
        title: note.title,
        content: note.content,
        version: nextVersion,
      },
    });

    return NextResponse.json(version);
  } catch (error) {
    console.error("Error creating note version:", error);
    return NextResponse.json({ error: "Failed to create version" }, { status: 500 });
  }
}

