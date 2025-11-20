import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

// POST /api/webhooks - Обработка webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get("x-webhook-signature");
    const webhookId = request.headers.get("x-webhook-id");

    // В реальном приложении здесь должна быть проверка подписи
    // и валидация webhook ID

    // Логируем webhook
    console.log("Webhook received:", {
      id: webhookId,
      body: JSON.stringify(body),
      timestamp: new Date().toISOString(),
    });

    // Обработка различных типов webhooks
    const eventType = body.type || body.event || "unknown";

    switch (eventType) {
      case "note.created":
      case "note.updated":
      case "note.deleted":
        // Обработка событий заметок
        break;
      case "file.uploaded":
      case "file.deleted":
        // Обработка событий файлов
        break;
      default:
        console.log("Unknown webhook event type:", eventType);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}

// GET /api/webhooks - Получить информацию о webhooks (для документации)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Webhook endpoint",
    methods: ["POST"],
    headers: {
      "x-webhook-id": "Webhook identifier",
      "x-webhook-signature": "Webhook signature for verification",
    },
    body: {
      type: "Event type (e.g., 'note.created', 'file.uploaded')",
      data: "Event data",
    },
  });
}

