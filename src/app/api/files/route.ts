import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { filePayload } from "@/lib/validators";
import { toRelative, writeFileFromBuffer } from "@/lib/storage";
import { trackActivity } from "@/lib/analytics/tracker";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  const parentId = request.nextUrl.searchParams.get("parentId");
  const files = await prisma.fileEntry.findMany({
    where: { ownerId: user.id, parentId: parentId ?? null },
    orderBy: [{ isFolder: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json(files);
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Файл не найден" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const relativePath = formData.get("relativePath")?.toString();
    const folder = formData.get("folder")?.toString(); // Для папки "заметки"
    
    // Определяем сегменты пути
    const segments: string[] = [];
    if (folder) {
      segments.push(folder);
    }
    if (relativePath) {
      // Извлекаем путь папок из relativePath (например, "folder1/folder2/file.txt")
      const pathParts = relativePath.split("/").slice(0, -1); // Убираем имя файла
      segments.push(...pathParts);
    }
    
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storedPath = writeFileFromBuffer(buffer, { userId: user.id, filename, segments });
    
    // Если есть relativePath, создаём структуру папок
    let parentId = formData.get("parentId")?.toString() ?? null;
    if (relativePath) {
      const pathParts = relativePath.split("/").slice(0, -1);
      for (const folderName of pathParts) {
        // Проверяем, существует ли папка
        let folderEntry = await prisma.fileEntry.findFirst({
          where: {
            ownerId: user.id,
            name: folderName,
            isFolder: true,
            parentId,
          },
        });
        
        if (!folderEntry) {
          folderEntry = await prisma.fileEntry.create({
            data: {
              name: folderName,
              isFolder: true,
              ownerId: user.id,
              parentId,
              path: `folder://${crypto.randomUUID()}`,
            },
          });
        }
        parentId = folderEntry.id;
      }
    }
    
    const entry = await prisma.fileEntry.create({
      data: {
        name: file.name,
        path: toRelative(storedPath),
        mimeType: file.type,
        size: buffer.length,
        parentId,
        ownerId: user.id,
      },
    });
    
    // Трекинг активности
    await trackActivity(user.id, "file_uploaded", "file", entry.id);
    
    return NextResponse.json(entry, { status: 201 });
  }

  const json = await request.json();
  const payload = filePayload.parse(json);
  const entry = await prisma.fileEntry.create({
    data: {
      name: payload.name,
      isFolder: payload.isFolder,
      ownerId: user.id,
      parentId: payload.parentId ?? null,
      path: payload.isFolder ? `folder://${crypto.randomUUID()}` : "",
    },
  });
  
  // Трекинг активности
  await trackActivity(user.id, payload.isFolder ? "folder_created" : "file_created", "file", entry.id);
  
  return NextResponse.json(entry, { status: 201 });
}
