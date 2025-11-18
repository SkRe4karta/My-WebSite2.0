import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { getAuditLogs, exportAuditLogs } from "@/lib/audit";

/**
 * GET /api/audit - Получить логи аудита
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const action = searchParams.get("action") || undefined;
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;
    const exportFormat = searchParams.get("export") === "true";

    if (exportFormat) {
      const logs = await exportAuditLogs(user.id, startDate, endDate);
      return NextResponse.json(logs);
    }

    const logs = await getAuditLogs(user.id, {
      limit,
      offset,
      action: action as any,
      startDate,
      endDate,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Ошибка при получении логов аудита" },
      { status: 500 }
    );
  }
}

