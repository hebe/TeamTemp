import { NextRequest, NextResponse } from "next/server";
import {
  getTeamByAdminToken,
  addQuestion,
  getDefaultQuestionSet,
  addQuestionToSet,
  removeQuestionFromSet,
  deactivateQuestion,
} from "@/lib/queries";

export async function POST(request: NextRequest) {
  const { adminToken, text, category, kind } = (await request.json()) as {
    adminToken: string;
    text: string;
    category: string;
    kind: "fixed" | "rotating_pool";
  };

  if (!adminToken || !text) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const team = await getTeamByAdminToken(adminToken);
  if (!team) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const question = await addQuestion(team.id, text, category || "general");
  if (!question) {
    return NextResponse.json(
      { error: "Could not add question" },
      { status: 500 }
    );
  }

  // Add to default question set
  const qSet = await getDefaultQuestionSet(team.id);
  if (qSet) {
    const maxPos = Math.max(0, ...qSet.items.map((i: { position: number }) => i.position));
    await addQuestionToSet(qSet.id, question.id, maxPos + 1, kind);
  }

  return NextResponse.json({ ok: true, question });
}

export async function DELETE(request: NextRequest) {
  const { adminToken, questionSetItemId, questionId } =
    (await request.json()) as {
      adminToken: string;
      questionSetItemId: string;
      questionId: string;
    };

  if (!adminToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const team = await getTeamByAdminToken(adminToken);
  if (!team) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  if (questionSetItemId) {
    await removeQuestionFromSet(questionSetItemId);
  }
  if (questionId) {
    await deactivateQuestion(questionId);
  }

  return NextResponse.json({ ok: true });
}
