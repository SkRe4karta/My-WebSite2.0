import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { deleteIfExists, resolveRelative } from "@/lib/storage";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  const { id } = await context.params;
  const body = await request.json();
  const entry = await prisma.fileEntry.findUnique({ where: { id } });
  if (!entry || entry.ownerId !== user.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const updated = await prisma.fileEntry.update({
    where: { id },
    data: {
      name: body.name ?? entry.name,
      parentId: body.parentId ?? entry.parentId,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  const { id } = await context.params;
  await removeEntry(id, user.id);
  return NextResponse.json({ ok: true });
}

async function removeEntry(id: string, ownerId: string) {
  const entry = await prisma.fileEntry.findUnique({ where: { id } });
  if (!entry || entry.ownerId !== ownerId) return;

  const children = await prisma.fileEntry.findMany({ where: { parentId: id } });
  for (const child of children) {
    await removeEntry(child.id, ownerId);
  }

  if (!entry.isFolder && entry.path) {
    deleteIfExists(resolveRelative(entry.path));
  }

  await prisma.fileEntry.delete({ where: { id } });
}
