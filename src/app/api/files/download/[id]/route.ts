import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { resolveRelative } from "@/lib/storage";
import fs from "fs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  const { id } = await context.params;
  const file = await prisma.fileEntry.findUnique({ where: { id } });
  if (!file || file.ownerId !== user.id || file.isFolder || !file.path) {
    return new Response("Not found", { status: 404 });
  }
  const buffer = fs.readFileSync(resolveRelative(file.path));
  return new Response(buffer, {
    headers: {
      "Content-Type": file.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
    },
  });
}
