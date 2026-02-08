import { NextRequest, NextResponse } from "next/server";
import {
  getTeamByAdminToken,
  getTeamSettings,
  getDashboardData,
  normalizeAvg,
  normalizeSpread,
} from "@/lib/queries";

/**
 * GET /api/admin/analytics?adminToken=xxx
 * Returns detailed distribution data per question per round.
 * Each round carries its own scale_max for correct distribution buckets.
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
  const currentScaleMax = settings?.scale_max ?? 3;

  const allAggregates = await getDashboardData(team.id, 20);

  // Group by question, then by round (chronologically)
  type RoundData = {
    round_id: string;
    round_date: string;
    scale_max: number;
    avg: number;
    normAvg: number;
    spread: number;
    normSpread: number;
    count: number;
    distribution: number[]; // counts per scale option (1..round's scaleMax)
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

    // Compute distribution using the round's own scale_max
    const roundScale = agg.scale_max;
    const distribution: number[] = [];
    for (let i = 1; i <= roundScale; i++) {
      distribution.push(agg.values.filter((v) => v === i).length);
    }

    questionMap.get(agg.question_id)!.rounds.push({
      round_id: agg.round_id,
      round_date: agg.round_created_at,
      scale_max: roundScale,
      avg: agg.avg,
      normAvg: normalizeAvg(agg.avg, roundScale),
      spread: agg.spread,
      normSpread: normalizeSpread(agg.spread, roundScale),
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
    currentScaleMax,
    questions: Array.from(questionMap.values()),
  });
}
