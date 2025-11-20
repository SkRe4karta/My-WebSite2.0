import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api/auth";

// GET /api/v1/notes - Публичное API для получения заметок
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiKey(request);
    
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!auth.permissions.includes("notes:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const notes = await prisma.note.findMany({
      where: { ownerId: auth.userId },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error fetching notes via API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

