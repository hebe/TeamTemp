import { NextRequest, NextResponse } from "next/server";
import { getAllTeams } from "@/lib/queries";

/**
 * GET /api/super/teams?token=xxx
 * Super-admin endpoint — lists all teams with summary stats.
 * Token validated against SUPER_ADMIN_TOKEN env var.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const superToken = process.env.SUPER_ADMIN_TOKEN;

  if (!superToken || token !== superToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teams = await getAllTeams();
  return NextResponse.json({ teams });
}
