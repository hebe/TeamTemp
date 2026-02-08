import { NextRequest, NextResponse } from "next/server";
import {
  getTeamByAdminToken,
  getTeamSettings,
  getDefaultQuestionSet,
  getRounds,
} from "@/lib/queries";

/**
 * GET /api/admin/load?adminToken=xxx
 * Returns all data the admin page needs in one call.
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
  const qSet = await getDefaultQuestionSet(team.id);
  const rounds = await getRounds(team.id);

  const fixedItems = (qSet?.items ?? []).filter((i) => i.kind === "fixed").map((i) => ({
    id: i.id,
    question_id: i.question_id,
    kind: i.kind,
    position: i.position,
    question: i.question ? { id: i.question.id, text: i.question.text, category: i.question.category } : undefined,
  }));

  const rotatingItems = (qSet?.items ?? []).filter((i) => i.kind === "rotating_pool").map((i) => ({
    id: i.id,
    question_id: i.question_id,
    kind: i.kind,
    position: i.position,
    question: i.question ? { id: i.question.id, text: i.question.text, category: i.question.category } : undefined,
  }));

  return NextResponse.json({
    team: { name: team.name, slug: team.slug },
    settings,
    fixedItems,
    rotatingItems,
    rounds: rounds.map((r) => ({
      id: r.id,
      token: r.token,
      status: r.status,
      opens_at: r.opens_at,
      closes_at: r.closes_at,
      created_at: r.created_at,
    })),
  });
}
