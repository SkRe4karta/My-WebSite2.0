import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { generateApiKey } from "@/lib/api/auth";

// GET /api/v1/api-keys - Получить все API ключи пользователя
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const keys = await prisma.apiKey.findMany({
      where: { ownerId: user.id },
      select: {
        id: true,
        name: true,
        key: true,
        permissions: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(keys);
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
  }
}

// POST /api/v1/api-keys - Создать новый API ключ
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { name, permissions, expiresAt } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const key = generateApiKey();
    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key,
        permissions: permissions || ["notes:read"],
        ownerId: user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        key: true,
        permissions: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json(apiKey, { status: 201 });
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}

