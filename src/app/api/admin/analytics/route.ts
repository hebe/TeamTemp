import { NextRequest, NextResponse } from "next/server";
import {
  getTeamByAdminToken,
  getTeamSettings,
  getDashboardData,
} from "@/lib/queries";

/**
 * GET /api/admin/analytics?adminToken=xxx
 * Returns detailed distribution data per question per round.
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

  const settings = await getTeamSettings(team.id);
  const scaleMax = settings?.scale_max ?? 3;

  const allAggregates = await getDashboardData(team.id, 20);

  // Group by question, then by round (chronologically)
  type RoundData = {
    round_id: string;
    round_date: string;
    avg: number;
    spread: number;
    count: number;
    distribution: number[]; // counts per scale option (1..scaleMax)
  };

  type QuestionAnalytics = {
    question_id: string;
    question_text: string;
    rounds: RoundData[];
  };

  const questionMap = new Map<string, QuestionAnalytics>();

  for (const agg of allAggregates) {
    if (!questionMap.has(agg.question_id)) {
      questionMap.set(agg.question_id, {
        question_id: agg.question_id,
        question_text: agg.question_text,
        rounds: [],
      });
    }

    // Compute distribution
    const distribution: number[] = [];
    for (let i = 1; i <= scaleMax; i++) {
      distribution.push(agg.values.filter((v) => v === i).length);
    }

    questionMap.get(agg.question_id)!.rounds.push({
      round_id: agg.round_id,
      round_date: agg.round_created_at,
      avg: agg.avg,
      spread: agg.spread,
      count: agg.count,
      distribution,
    });
  }

  // Sort rounds chronologically within each question
  for (const q of questionMap.values()) {
    q.rounds.sort(
      (a, b) => new Date(a.round_date).getTime() - new Date(b.round_date).getTime()
    );
  }

  return NextResponse.json({
    scaleMax,
    questions: Array.from(questionMap.values()),
  });
}
