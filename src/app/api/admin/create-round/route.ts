import { NextRequest, NextResponse } from "next/server";
import { getTeamByAdminToken, createRound } from "@/lib/queries";

export async function POST(request: NextRequest) {
  const { adminToken } = (await request.json()) as { adminToken: string };

  if (!adminToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const team = await getTeamByAdminToken(adminToken);
  if (!team) {
    return NextResponse.json({ error: "Invalid admin token" }, { status: 403 });
  }

  const round = await createRound(team.id);
  if (!round) {
    return NextResponse.json(
      { error: "Could not create round" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    round: {
      id: round.id,
      token: round.token,
      respondLink: `/r/${round.token}`,
    },
  });
}
