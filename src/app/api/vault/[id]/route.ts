import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { decryptString } from "@/lib/crypto";
import { deleteIfExists, resolveRelative } from "@/lib/storage";

type VaultMeta = {
  payload?: string;
  iv?: string;
  tag?: string;
  path?: string;
  [key: string]: unknown;
};

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  const { id } = await context.params;
  const item = await prisma.vaultItem.findUnique({ where: { id, ownerId: user.id } });
  if (!item) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const includeValue = request.nextUrl.searchParams.get("raw") === "1";
  const meta = (item.metadata ?? {}) as VaultMeta;
  let value: string | null = null;
  if (includeValue && meta.payload && meta.iv && meta.tag) {
    value = decryptString(meta.payload, meta.iv, meta.tag);
  }
  return NextResponse.json({ ...item, value });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  const { id } = await context.params;
  const item = await prisma.vaultItem.findUnique({ where: { id, ownerId: user.id } });
  if (!item) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const meta = (item.metadata ?? {}) as VaultMeta;
  if (meta.path) {
    deleteIfExists(resolveRelative(meta.path));
  }
  await prisma.vaultItem.delete({ where: { id } });
  await prisma.vaultAudit.create({ data: { actorId: user.id, vaultItemId: id, action: "DELETE" } });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  const { id } = await context.params;
  const body = await request.json();
  const item = await prisma.vaultItem.update({
    where: { id, ownerId: user.id },
    data: {
      label: body.label,
      description: body.description,
    },
  });
  await prisma.vaultAudit.create({ data: { actorId: user.id, vaultItemId: id, action: "UPDATE" } });
  return NextResponse.json(item);
}
