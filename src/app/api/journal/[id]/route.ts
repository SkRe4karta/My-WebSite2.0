import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { ideaPayload } from "@/lib/validators";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  const { id } = await context.params;
  const payload = ideaPayload.parse(await request.json());
  const idea = await prisma.ideaEntry.update({
    where: { id, ownerId: user.id },
    data: {
      title: payload.title,
      content: payload.content,
      mood: payload.mood,
      category: payload.category,
      tags: payload.tags,
      date: new Date(payload.date),
    },
  });
  return NextResponse.json(idea);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  const { id } = await context.params;
  await prisma.ideaEntry.delete({ where: { id, ownerId: user.id } });
  return NextResponse.json({ ok: true });
}
