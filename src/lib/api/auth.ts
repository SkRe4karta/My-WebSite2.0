import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function authenticateApiKey(request: NextRequest): Promise<{ userId: string; permissions: string[] } | null> {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.substring(7);

  try {
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { owner: true },
    });

    if (!key) {
      return null;
    }

    // Проверяем срок действия
    if (key.expiresAt && new Date() > key.expiresAt) {
      return null;
    }

    // Обновляем время последнего использования
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    const permissions = Array.isArray(key.permissions) 
      ? key.permissions.filter((item): item is string => typeof item === 'string')
      : [];

    return {
      userId: key.ownerId,
      permissions,
    };
  } catch (error) {
    console.error("Error authenticating API key:", error);
    return null;
  }
}

export function generateApiKey(): string {
  return `sk_${crypto.randomBytes(32).toString("hex")}`;
}

