import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { encryptBuffer, encryptString } from "@/lib/crypto";
import { toRelative, writeFileFromBuffer } from "@/lib/storage";
import { vaultPayload } from "@/lib/validators";
import { trackActivity } from "@/lib/analytics/tracker";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  const items = await prisma.vaultItem.findMany({
    where: { ownerId: user.id },
    include: { file: true, auditTrail: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Файл обязателен" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const encrypted = encryptBuffer(buffer);
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}.vault`;
    const stored = writeFileFromBuffer(encrypted.encrypted, {
      userId: user.id,
      filename,
      vault: true,
    });

    const item = await prisma.vaultItem.create({
      data: {
        label: formData.get("label")?.toString() ?? file.name,
        description: formData.get("description")?.toString() ?? undefined,
        secretType: "FILE",
        metadata: {
          iv: encrypted.iv.toString("base64"),
          tag: encrypted.authTag.toString("base64"),
          path: toRelative(stored),
          originalName: file.name,
          mimeType: file.type,
        },
        ownerId: user.id,
      },
      include: { auditTrail: true },
    });

    await logVaultAction(user.id, item.id, "UPLOAD_FILE");
    
    // Трекинг активности
    await trackActivity(user.id, "vault_item_created", "vault", item.id);
    
    return NextResponse.json(item, { status: 201 });
  }

  const body = await request.json();
  const payload = vaultPayload.parse(body);
  
  // Шифруем значение и пароль, если они есть
  let meta: any = undefined;
  if (payload.metadata) {
    meta = { ...payload.metadata };
    if (meta.value) {
      meta.value = encryptString(meta.value);
    }
    if (meta.password) {
      meta.password = encryptString(meta.password);
    }
  }

  const item = await prisma.vaultItem.create({
    data: {
      label: payload.label,
      description: payload.description,
      secretType: payload.secretType,
      metadata: meta,
      ownerId: user.id,
    },
    include: { auditTrail: true },
  });

  await logVaultAction(user.id, item.id, "CREATE_SECRET");
  
  // Трекинг активности
  await trackActivity(user.id, "vault_item_created", "vault", item.id);
  
  return NextResponse.json(item, { status: 201 });
}

async function logVaultAction(actorId: string, vaultItemId: string, action: string) {
  await prisma.vaultAudit.create({ data: { actorId, vaultItemId, action } });
}
