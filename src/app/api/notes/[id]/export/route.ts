import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { exportNoteToMarkdown } from "@/lib/export/markdown";

// GET /api/notes/[id]/export?format=markdown|pdf
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "markdown";
    const { id } = await params;

    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.ownerId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (format === "markdown") {
      // Экспорт в Markdown используя утилиту
      const tags = note.tags.map((nt) => nt.tag.name);
      const markdown = exportNoteToMarkdown({
        title: note.title,
        content: note.content,
        tags,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      });

      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="${note.title.replace(/[^a-z0-9]/gi, "_")}.md"`,
        },
      });
    } else if (format === "pdf") {
      // Для PDF нужна библиотека типа puppeteer или jsPDF
      // Пока возвращаем JSON, можно позже добавить реальный PDF
      return NextResponse.json({
        error: "PDF export not yet implemented. Use markdown format.",
      }, { status: 501 });
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  } catch (error) {
    console.error("Error exporting note:", error);
    return NextResponse.json({ error: "Failed to export note" }, { status: 500 });
  }
}

