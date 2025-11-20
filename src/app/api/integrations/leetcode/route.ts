import { NextRequest, NextResponse } from "next/server";
import { getLeetCodeStats } from "@/lib/integrations/leetcode";
import { requireUser } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    const stats = await getLeetCodeStats(username);
    
    if (!stats) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching LeetCode data:", error);
    return NextResponse.json({ error: "Failed to fetch LeetCode data" }, { status: 500 });
  }
}

