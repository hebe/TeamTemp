import { NextRequest, NextResponse } from "next/server";
import { getTeamByAdminToken, getAllFreeTexts } from "@/lib/queries";

/**
 * GET /api/admin/comments?adminToken=xxx
 * Returns all free-text comments across all closed rounds, latest first.
 */
export async function GET(request: NextRequest) {
  const adminToken = request.nextUrl.searchParams.get("adminToken");
  if (!adminToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const team = await getTeamByAdminToken(adminToken);
  if (!team) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const comments = await getAllFreeTexts(team.id);

  return NextResponse.json({ comments });
}
