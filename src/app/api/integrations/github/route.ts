import { NextRequest, NextResponse } from "next/server";
import { getGitHubActivity, getGitHubRepos } from "@/lib/integrations/github";
import { requireUser } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("username");
    const type = searchParams.get("type") || "activity"; // activity or repos
    const token = searchParams.get("token"); // GitHub token (опционально)

    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    if (type === "activity") {
      const activity = await getGitHubActivity(username, token || undefined);
      return NextResponse.json({ activity });
    } else if (type === "repos") {
      const repos = await getGitHubRepos(username, token || undefined);
      return NextResponse.json({ repos });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching GitHub data:", error);
    return NextResponse.json({ error: "Failed to fetch GitHub data" }, { status: 500 });
  }
}

