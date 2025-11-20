import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { importFromObsidian } from "@/lib/integrations/importers/obsidian";
import { importFromNotion } from "@/lib/integrations/importers/notion";

// POST /api/integrations/import - Импорт данных из внешних сервисов
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const formData = await request.formData();
    const source = formData.get("source") as string; // "obsidian", "notion", "markdown"

    if (source === "obsidian" || source === "markdown") {
      const files = formData.getAll("files") as File[];
      
      if (files.length === 0) {
        return NextResponse.json({ error: "No files provided" }, { status: 400 });
      }

      const notes = await importFromObsidian(files);

      // Создаем заметки в БД
      const created = await Promise.all(
        notes.map((note) =>
          prisma.note.create({
            data: {
              title: note.title,
              content: note.content,
              format: "MARKDOWN",
              status: "DRAFT",
              ownerId: user.id,
              createdAt: note.createdAt,
              updatedAt: note.updatedAt,
            },
          })
        )
      );

      return NextResponse.json({ imported: created.length, notes: created });
    } else if (source === "notion") {
      const token = formData.get("token") as string;
      const databaseId = formData.get("databaseId") as string;

      if (!token || !databaseId) {
        return NextResponse.json({ error: "Token and databaseId are required" }, { status: 400 });
      }

      const pages = await importFromNotion(token, databaseId);

      // Создаем заметки в БД
      const created = await Promise.all(
        pages.map((page) =>
          prisma.note.create({
            data: {
              title: page.title,
              content: page.content,
              format: "MARKDOWN",
              status: "DRAFT",
              ownerId: user.id,
            },
          })
        )
      );

      return NextResponse.json({ imported: created.length, notes: created });
    }

    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  } catch (error) {
    console.error("Error importing data:", error);
    return NextResponse.json({ error: "Failed to import data" }, { status: 500 });
  }
}

