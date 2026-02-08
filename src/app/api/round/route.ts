import { NextRequest, NextResponse } from "next/server";
import { getRoundByToken, getTeamSettings, getRoundQuestions } from "@/lib/queries";

/**
 * GET /api/round?token=xxx
 * Returns round info, settings, and questions for the respond page.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const round = await getRoundByToken(token);
  if (!round) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (round.status !== "open") {
    return NextResponse.json({ round: { status: "closed" } });
  }

  const settings = await getTeamSettings(round.team_id);
  const rqs = await getRoundQuestions(round.id);

  return NextResponse.json({
    round: {
      id: round.id,
      status: round.status,
    },
    settings: {
      scale_max: settings?.scale_max ?? 3,
      allow_free_text: settings?.allow_free_text ?? true,
    },
    questions: rqs.map((rq) => ({
      id: rq.id,
      question_text: rq.question_text,
      kind: rq.kind,
      position: rq.position,
    })),
  });
}
