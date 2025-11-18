import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  const [notes, files, folders, vault, ideas, publishedNotes, draftNotes, archivedNotes, totalFileSize] = await Promise.all([
    prisma.note.count({ where: { ownerId: user.id } }),
    prisma.fileEntry.count({ where: { ownerId: user.id, isFolder: false } }),
    prisma.fileEntry.count({ where: { ownerId: user.id, isFolder: true } }),
    prisma.vaultItem.count({ where: { ownerId: user.id } }),
    prisma.ideaEntry.count({ where: { ownerId: user.id } }),
    prisma.note.count({ where: { ownerId: user.id, status: "PUBLISHED" } }),
    prisma.note.count({ where: { ownerId: user.id, status: "DRAFT" } }),
    prisma.note.count({ where: { ownerId: user.id, status: "ARCHIVED" } }),
    prisma.fileEntry.aggregate({
      where: { ownerId: user.id, isFolder: false },
      _sum: { size: true },
    }),
  ]);

  const sizeInMB = totalFileSize._sum.size ? Math.round((totalFileSize._sum.size / 1024 / 1024) * 100) / 100 : 0;

  return NextResponse.json({
    notes,
    files,
    folders,
    vault,
    ideas,
    publishedNotes,
    draftNotes,
    archivedNotes,
    totalFileSize: sizeInMB,
  });
}

