import { NextRequest, NextResponse } from "next/server";
import {
  getTeamByAdminToken,
  getRoundById,
  closeRound,
} from "@/lib/queries";

export async function POST(request: NextRequest) {
  const { adminToken, roundId } = (await request.json()) as {
    adminToken: string;
    roundId: string;
  };

  if (!adminToken || !roundId) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const team = await getTeamByAdminToken(adminToken);
  if (!team) {
    return NextResponse.json({ error: "Invalid admin token" }, { status: 403 });
  }

  const round = await getRoundById(roundId);
  if (!round || round.team_id !== team.id) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const ok = await closeRound(roundId);
  if (!ok) {
    return NextResponse.json(
      { error: "Could not close round" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
