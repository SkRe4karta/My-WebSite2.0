import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { notePayload } from "@/lib/validators";
import { trackActivity } from "@/lib/analytics/tracker";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const note = await prisma.note.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } }, attachments: { include: { file: true } } },
  });
  if (!note) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(note);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  const { id } = await context.params;
  const body = await request.json();
  const payload = notePayload.parse(body);

  // Получаем текущую версию заметки для создания версии
  const currentNote = await prisma.note.findUnique({
    where: { id, ownerId: user.id },
  });

  if (!currentNote) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  // Создаем версию перед обновлением
  const lastVersion = await prisma.noteVersion.findFirst({
    where: { noteId: id },
    orderBy: { version: "desc" },
  });
  const nextVersion = (lastVersion?.version || 0) + 1;

  await prisma.noteVersion.create({
    data: {
      noteId: id,
      title: currentNote.title,
      content: currentNote.content,
      version: nextVersion,
    },
  });

  await prisma.note.update({
    where: { id, ownerId: user.id },
    data: {
      title: payload.title,
      content: payload.content,
      format: payload.format,
      status: payload.status,
      folder: payload.folder ?? undefined,
      category: payload.category ?? undefined,
      checklist: payload.checklist,
    },
  });

  await prisma.noteTag.deleteMany({ where: { noteId: id } });
  if (payload.tags?.length) {
    const trimmed = payload.tags.map((name) => name.trim()).filter(Boolean);
    const entities = await Promise.all(
      trimmed.map((name) => prisma.tag.upsert({ where: { name }, update: {}, create: { name } })),
    );
    await prisma.noteTag.createMany({
      data: entities.map((tag) => ({ noteId: id, tagId: tag.id })),
    });
  }

  await prisma.attachment.deleteMany({ where: { noteId: id } });
  if (payload.attachments?.length) {
    const files = await prisma.fileEntry.findMany({ where: { id: { in: payload.attachments }, ownerId: user.id } });
    await prisma.attachment.createMany({
      data: files.map((file) => ({ noteId: id, fileId: file.id })),
    });
  }

  const note = await prisma.note.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } }, attachments: { include: { file: true } } },
  });

  // Трекинг активности
  await trackActivity(user.id, "note_updated", "note", id);

  return NextResponse.json(note);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  const { id } = await context.params;
  await prisma.note.delete({ where: { id, ownerId: user.id } });
  
  // Трекинг активности
  await trackActivity(user.id, "note_deleted", "note", id);

  return NextResponse.json({ ok: true });
}

