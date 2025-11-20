import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

// GET /api/notes/[id]/share - Получить список пользователей с доступом
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const shares = await prisma.noteShare.findMany({
      where: { noteId: id },
      include: {
        sharedWith: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(shares);
  } catch (error) {
    console.error("Error fetching note shares:", error);
    return NextResponse.json({ error: "Failed to fetch shares" }, { status: 500 });
  }
}

// POST /api/notes/[id]/share - Поделиться заметкой
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const { userId, permission } = await request.json();

    if (!userId || !permission) {
      return NextResponse.json({ error: "userId and permission are required" }, { status: 400 });
    }

    if (!["READ", "WRITE"].includes(permission)) {
      return NextResponse.json({ error: "Invalid permission" }, { status: 400 });
    }

    const note = await prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.ownerId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Проверяем, существует ли пользователь
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const share = await prisma.noteShare.create({
      data: {
        noteId: id,
        sharedWithId: userId,
        permission,
      },
      include: {
        sharedWith: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(share);
  } catch (error: any) {
    console.error("Error sharing note:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Already shared with this user" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to share note" }, { status: 500 });
  }
}

// DELETE /api/notes/[id]/share - Удалить доступ
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const note = await prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.ownerId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.noteShare.deleteMany({
      where: {
        noteId: id,
        sharedWithId: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing share:", error);
    return NextResponse.json({ error: "Failed to remove share" }, { status: 500 });
  }
}

