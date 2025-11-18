import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

/**
 * GET /api/search - Глобальный поиск по всем модулям
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const type = searchParams.get("type") || "all"; // all, notes, files, vault, ideas
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results: any[] = [];

    // Поиск по заметкам
    if (type === "all" || type === "notes") {
      const notes = await prisma.note.findMany({
        where: {
          ownerId: user.id,
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
          ],
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      results.push(
        ...notes.map((note) => ({
          type: "note",
          id: note.id,
          title: note.title,
          content: note.content.substring(0, 200),
          url: `/admin/notes`,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        }))
      );
    }

    // Поиск по файлам
    if (type === "all" || type === "files") {
      const files = await prisma.fileEntry.findMany({
        where: {
          ownerId: user.id,
          isFolder: false,
          name: { contains: query },
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          mimeType: true,
          size: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      results.push(
        ...files.map((file) => ({
          type: "file",
          id: file.id,
          title: file.name,
          content: `${file.mimeType || "unknown"} • ${file.size ? `${(file.size / 1024).toFixed(1)} KB` : "unknown size"}`,
          url: `/admin/files`,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        }))
      );
    }

    // Поиск по Vault
    if (type === "all" || type === "vault") {
      const vaultItems = await prisma.vaultItem.findMany({
        where: {
          ownerId: user.id,
          label: { contains: query },
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          label: true,
          description: true,
          secretType: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      results.push(
        ...vaultItems.map((item) => ({
          type: "vault",
          id: item.id,
          title: item.label,
          content: item.description || `${item.secretType}`,
          url: `/admin/vault`,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }))
      );
    }

    // Поиск по идеям (журнал)
    if (type === "all" || type === "ideas") {
      const ideas = await prisma.ideaEntry.findMany({
        where: {
          ownerId: user.id,
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
          ],
        },
        take: limit,
        orderBy: { date: "desc" },
        select: {
          id: true,
          title: true,
          content: true,
          date: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      results.push(
        ...ideas.map((idea) => ({
          type: "idea",
          id: idea.id,
          title: idea.title,
          content: idea.content.substring(0, 200),
          url: `/admin/journal`,
          createdAt: idea.createdAt,
          updatedAt: idea.updatedAt,
        }))
      );
    }

    // Сортируем по дате обновления
    results.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

    // Подсветка результатов
    const highlightText = (text: string, query: string): string => {
      if (!text) return "";
      const regex = new RegExp(`(${query})`, "gi");
      return text.replace(regex, "<mark class='bg-[#4CAF50]/30 text-[#4CAF50]'>$1</mark>");
    };

    const highlightedResults = results.map((result) => ({
      ...result,
      highlightedTitle: highlightText(result.title, query),
      highlightedContent: highlightText(result.content, query),
    }));

    return NextResponse.json({
      results: highlightedResults.slice(0, limit),
      total: results.length,
    });
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json(
      { error: "Ошибка при поиске" },
      { status: 500 }
    );
  }
}

