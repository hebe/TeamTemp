import { NextRequest, NextResponse } from "next/server";
import { getRoundByToken, submitResponses, getSubmissionCount } from "@/lib/queries";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, answers, freeText } = body as {
    token: string;
    answers: { round_question_id: string; value: number }[];
    freeText?: string;
  };

  if (!token || !answers || answers.length === 0) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const round = await getRoundByToken(token);
  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }
  if (round.status !== "open") {
    return NextResponse.json(
      { error: "This round is no longer open" },
      { status: 400 }
    );
  }

  const submission = await submitResponses(round.id, answers, freeText);
  if (!submission) {
    return NextResponse.json(
      { error: "Could not save response" },
      { status: 500 }
    );
  }

  const count = await getSubmissionCount(round.id);
  return NextResponse.json({ ok: true, responseCount: count });
}
