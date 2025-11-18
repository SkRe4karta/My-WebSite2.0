import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { decryptBuffer } from "@/lib/crypto";
import { resolveRelative, readFileToBuffer } from "@/lib/storage";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  const { id } = await context.params;
  const item = await prisma.vaultItem.findUnique({ where: { id, ownerId: user.id } });
  
  if (!item) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const meta = (item.metadata ?? {}) as any;
  if (!meta.path) {
    return NextResponse.json({ message: "File not found" }, { status: 404 });
  }

  try {
    const encrypted = readFileToBuffer(resolveRelative(meta.path));
    const iv = Buffer.from(meta.iv, "base64");
    const authTag = Buffer.from(meta.tag, "base64");
    const decrypted = decryptBuffer(encrypted, iv, authTag);

    return new Response(decrypted, {
      headers: {
        "Content-Type": meta.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(meta.originalName || "file")}"`,
      },
    });
  } catch (error) {
    console.error("Failed to decrypt file:", error);
    return NextResponse.json({ message: "Failed to decrypt file" }, { status: 500 });
  }
}

