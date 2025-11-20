import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

// GET /api/favorites - Получить все избранное
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const favorites = await prisma.favorite.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(favorites);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 });
  }
}

// POST /api/favorites - Добавить в избранное
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { entityType, entityId } = await request.json();

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
    }

    const favorite = await prisma.favorite.create({
      data: {
        entityType,
        entityId,
        ownerId: user.id,
      },
    });

    return NextResponse.json(favorite);
  } catch (error: any) {
    console.error("Error creating favorite:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Already in favorites" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create favorite" }, { status: 500 });
  }
}

// DELETE /api/favorites - Удалить из избранного
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
    }

    await prisma.favorite.deleteMany({
      where: {
        ownerId: user.id,
        entityType,
        entityId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting favorite:", error);
    return NextResponse.json({ error: "Failed to delete favorite" }, { status: 500 });
  }
}

