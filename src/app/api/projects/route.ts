import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

// GET /api/projects - Получить все проекты
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const featured = searchParams.get("featured");

    const where: any = {};
    if (status) where.status = status;
    if (featured === "true") where.featured = true;

    const projects = await prisma.project.findMany({
      where,
      orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    });

    // Преобразуем stack из JSON в массив строк
    const formattedProjects = projects.map((project) => {
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
      
      return {
        ...project,
        stack: stackArray,
      };
    });

    return NextResponse.json(formattedProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    // Возвращаем пустой массив вместо объекта с ошибкой, чтобы фронтенд не ломался
    return NextResponse.json([]);
  }
}

// POST /api/projects - Создать новый проект (только для авторизованных)
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { title, slug, description, status, stack, githubUrl, demoUrl, imageUrl, featured, order, metadata } = body;

    const project = await prisma.project.create({
      data: {
        title,
        slug: slug || title.toLowerCase().replace(/\s+/g, "-"),
        description,
        status: status || "development",
        stack: stack || [],
        githubUrl,
        demoUrl,
        imageUrl,
        featured: featured || false,
        order: order || 0,
        metadata: metadata || {},
      },
    });

    return NextResponse.json(project);
  } catch (error: any) {
    console.error("Error creating project:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Project with this slug already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

