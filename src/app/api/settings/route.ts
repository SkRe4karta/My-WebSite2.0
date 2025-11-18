import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  const settings = await prisma.userSetting.findUnique({ where: { userId: user.id } });
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const user = await requireUser(request);
  const body = await request.json();
  const settings = await prisma.userSetting.upsert({
    where: { userId: user.id },
    update: body,
    create: { ...body, userId: user.id },
  });
  return NextResponse.json(settings);
}
