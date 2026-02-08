import { NextRequest, NextResponse } from "next/server";
import {
  getTeamByAdminToken,
  getTeamSettings,
  updateTeamSettings,
} from "@/lib/queries";

export async function GET(request: NextRequest) {
  const adminToken = request.nextUrl.searchParams.get("adminToken");
  if (!adminToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const team = await getTeamByAdminToken(adminToken);
  if (!team) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const settings = await getTeamSettings(team.id);
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const adminToken = body.adminToken as string;

  if (!adminToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const team = await getTeamByAdminToken(adminToken);
  if (!team) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const updates: Partial<{ cadence: "weekly" | "biweekly" | "monthly"; scale_max: 3 | 4 | 5; min_responses_to_show: number; allow_free_text: boolean }> = {};
  if (body.cadence) updates.cadence = body.cadence;
  if (body.scale_max !== undefined) updates.scale_max = body.scale_max;
  if (body.min_responses_to_show !== undefined) updates.min_responses_to_show = body.min_responses_to_show;
  if (body.allow_free_text !== undefined) updates.allow_free_text = body.allow_free_text;

  const ok = await updateTeamSettings(team.id, updates);
  if (!ok) {
    return NextResponse.json(
      { error: "Could not update" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
