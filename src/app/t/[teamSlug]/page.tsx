import {
  getTeamBySlug,
  getTeamSettings,
  getDashboardData,
  getSubmissionCount,
  getRounds,
  getDefaultQuestionSet,
  normalizeAvg,
  normalizeSpread,
} from "@/lib/queries";
import { notFound } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ teamSlug: string }>;
};

export default async function TeamDashboard({ params }: PageProps) {
  const { teamSlug } = await params;

  const team = await getTeamBySlug(teamSlug);
  if (!team) notFound();

  const settings = await getTeamSettings(team.id);
  const minResponses = settings?.min_responses_to_show ?? 4;
  const scaleMax = settings?.scale_max ?? 3;

  const allAggregates = await getDashboardData(team.id, 8);
  const rounds = await getRounds(team.id);
  const qSet = await getDefaultQuestionSet(team.id);
  const rotatingQuestionIds = new Set(
    (qSet?.items ?? [])
      .filter((i) => i.kind === "rotating_pool")
      .map((i) => i.question_id)
  );
  const closedRounds = rounds.filter((r) => r.status === "closed");

  // Check submission counts per round
  const roundCounts: Record<string, number> = {};
  for (const r of closedRounds) {
    roundCounts[r.id] = await getSubmissionCount(r.id);
  }

  // Filter out rounds with too few responses
  const visibleRoundIds = new Set(
    Object.entries(roundCounts)
      .filter(([, count]) => count >= minResponses)
      .map(([id]) => id)
  );

  const visibleAggregates = allAggregates.filter((a) =>
    visibleRoundIds.has(a.round_id)
  );

  // Group by question_id for sparklines
  const questionMap = new Map<
    string,
    {
      question_id: string;
      question_text: string;
      isRotating: boolean;
      dataPoints: {
        round_id: string;
        round_created_at: string;
        scale_max: number;
        avg: number;
        normAvg: number;
        spread: number;
        normSpread: number;
        count: number;
        values: number[];
      }[];
    }
  >();

  for (const agg of visibleAggregates) {
    if (!questionMap.has(agg.question_id)) {
      questionMap.set(agg.question_id, {
        question_id: agg.question_id,
        question_text: agg.question_text,
        isRotating: rotatingQuestionIds.has(agg.question_id),
        dataPoints: [],
      });
    }
    questionMap.get(agg.question_id)!.dataPoints.push({
      round_id: agg.round_id,
      round_created_at: agg.round_created_at,
      scale_max: agg.scale_max,
      avg: agg.avg,
      normAvg: normalizeAvg(agg.avg, agg.scale_max),
      spread: agg.spread,
      normSpread: normalizeSpread(agg.spread, agg.scale_max),
      count: agg.count,
      values: agg.values,
    });
  }

  // Sort data points chronologically within each question
  for (const q of questionMap.values()) {
    q.dataPoints.sort(
      (a, b) =>
        new Date(a.round_created_at).getTime() -
        new Date(b.round_created_at).getTime()
    );
  }

  const questionCards = Array.from(questionMap.values());

  // Compute "What changed?" — use normalized deltas so 3→5 scale changes compare fairly
  const changes: {
    question_text: string;
    delta: number;
    direction: "up" | "down";
  }[] = [];

  for (const q of questionCards) {
    if (q.dataPoints.length >= 2) {
      const prev = q.dataPoints[q.dataPoints.length - 2].normAvg;
      const curr = q.dataPoints[q.dataPoints.length - 1].normAvg;
      const delta = Math.round((curr - prev) * 100) / 100;
      if (delta !== 0) {
        changes.push({
          question_text: q.question_text,
          delta,
          direction: delta > 0 ? "up" : "down",
        });
      }
    }
  }

  const increases = changes
    .filter((c) => c.direction === "up")
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 2);
  const decreases = changes
    .filter((c) => c.direction === "down")
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 2);

  // Find the most recent round for retro link
  const lastClosedRound = closedRounds[0];

  return (
    <DashboardClient
      teamName={team.name}
      teamSlug={team.slug}
      questionCards={questionCards}
      increases={increases}
      decreases={decreases}
      hasEnoughData={visibleRoundIds.size > 0}
      lastRoundId={lastClosedRound?.id ?? null}
    />
  );
}
