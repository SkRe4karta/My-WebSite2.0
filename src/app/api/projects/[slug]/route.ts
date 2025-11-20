import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

// GET /api/projects/[slug] - Получить проект по slug
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const project = await prisma.project.findUnique({
      where: { slug },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Преобразуем stack из JSON в массив строк
    let stackArray: string[] = [];
    if (Array.isArray(project.stack)) {
      stackArray = project.stack.filter((item): item is string => typeof item === 'string');
    } else if (typeof project.stack === 'string') {
      try {
        const parsed = JSON.parse(project.stack);
        stackArray = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
      } catch {
        stackArray = [];
      }
    } else if (project.stack && typeof project.stack === 'object') {
      stackArray = Object.values(project.stack).filter((item): item is string => typeof item === 'string');
    }
    
    const formattedProject = {
      ...project,
      stack: stackArray,
    };

    return NextResponse.json(formattedProject);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

// PUT /api/projects/[slug] - Обновить проект
export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireUser(request);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { slug } = await params;
    const body = await request.json();
    const project = await prisma.project.update({
      where: { slug },
      data: body,
    });

    return NextResponse.json(project);
  } catch (error: any) {
    console.error("Error updating project:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

// DELETE /api/projects/[slug] - Удалить проект
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireUser(request);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { slug } = await params;
    await prisma.project.delete({
      where: { slug },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting project:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}

