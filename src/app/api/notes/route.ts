import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { notePayload } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  const search = request.nextUrl.searchParams.get("q") ?? undefined;
  const notes = await prisma.note.findMany({
    where: {
      ownerId: user.id,
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { content: { contains: search } },
            ],
          }
        : {}),
    },
    include: { tags: { include: { tag: true } }, attachments: { include: { file: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  const body = await request.json();
  const payload = notePayload.parse(body);
  const note = await prisma.note.create({
    data: {
      title: payload.title,
      content: payload.content,
      format: payload.format,
      status: payload.status,
      folder: payload.folder ?? undefined,
      category: payload.category ?? undefined,
      checklist: payload.checklist,
      ownerId: user.id,
    },
  });

  if (payload.tags?.length) {
    await syncTags(note.id, payload.tags);
  }
  if (payload.attachments?.length) {
    await attachFiles(note.id, payload.attachments, user.id);
  }

  const full = await prisma.note.findUnique({
    where: { id: note.id },
    include: { tags: { include: { tag: true } }, attachments: { include: { file: true } } },
  });

  return NextResponse.json(full, { status: 201 });
}

async function syncTags(noteId: string, tags: string[]) {
  const trimmed = tags.map((name) => name.trim()).filter(Boolean);
  if (!trimmed.length) return;
  const entities = await Promise.all(
    trimmed.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
  await prisma.noteTag.createMany({
    data: entities.map((tag) => ({ noteId, tagId: tag.id })),
  });
}

async function attachFiles(noteId: string, fileIds: string[], ownerId: string) {
  const unique = Array.from(new Set(fileIds));
  const files = await prisma.fileEntry.findMany({
    where: { id: { in: unique }, ownerId, isFolder: false },
  });
  if (!files.length) return;
  await prisma.attachment.createMany({
    data: files.map((file) => ({ noteId, fileId: file.id })),
  });
}

