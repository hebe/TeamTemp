import {
  readDB, writeDB, uid, now,
  type Team, type TeamSettings, type Question,
  type QuestionSetItem, type Round, type RoundQuestion,
} from "./store";

export type { Team, TeamSettings, Question, QuestionSetItem, Round, RoundQuestion };

// Re-export aggregate type used by dashboard/retro pages
export type QuestionAggregate = {
  question_id: string;
  question_text: string;
  round_id: string;
  round_created_at: string;
  avg: number;
  spread: number;
  count: number;
  values: number[];
};

// ─── Team Lookups ────────────────────────────────────────────────────

export async function getTeamBySlug(slug: string) {
  const db = readDB();
  return db.teams.find((t) => t.slug === slug) ?? null;
}

export async function getTeamByAdminToken(token: string) {
  const db = readDB();
  return db.teams.find((t) => t.admin_token === token) ?? null;
}

export async function getTeamSettings(teamId: string) {
  const db = readDB();
  return db.team_settings.find((s) => s.team_id === teamId) ?? null;
}

export async function updateTeamSettings(
  teamId: string,
  settings: Partial<Omit<TeamSettings, "team_id">>
) {
  const db = readDB();
  const idx = db.team_settings.findIndex((s) => s.team_id === teamId);
  if (idx === -1) return false;
  db.team_settings[idx] = { ...db.team_settings[idx], ...settings };
  writeDB(db);
  return true;
}

// ─── Questions ───────────────────────────────────────────────────────

export async function getQuestions(teamId: string) {
  const db = readDB();
  return db.question_bank
    .filter((q) => q.team_id === teamId && q.is_active)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function getDefaultQuestionSet(teamId: string) {
  const db = readDB();
  const qs = db.question_set.find(
    (s) => s.team_id === teamId && s.is_default
  );
  if (!qs) return null;

  const items = db.question_set_item
    .filter((i) => i.question_set_id === qs.id)
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      ...item,
      question: db.question_bank.find((q) => q.id === item.question_id),
    }));

  return { ...qs, items } as typeof qs & { items: (QuestionSetItem & { question?: Question })[] };
}

export async function addQuestion(teamId: string, text: string, category: string) {
  const db = readDB();
  const q: Question = {
    id: uid(),
    team_id: teamId,
    text,
    category,
    is_active: true,
    created_at: now(),
  };
  db.question_bank.push(q);
  writeDB(db);
  return q;
}

export async function addQuestionToSet(
  questionSetId: string,
  questionId: string,
  position: number,
  kind: "fixed" | "rotating_pool"
) {
  const db = readDB();
  db.question_set_item.push({
    id: uid(),
    question_set_id: questionSetId,
    question_id: questionId,
    position,
    kind,
  });
  writeDB(db);
  return true;
}

export async function removeQuestionFromSet(itemId: string) {
  const db = readDB();
  db.question_set_item = db.question_set_item.filter((i) => i.id !== itemId);
  writeDB(db);
  return true;
}

export async function deactivateQuestion(questionId: string) {
  const db = readDB();
  const q = db.question_bank.find((q) => q.id === questionId);
  if (!q) return false;
  q.is_active = false;
  writeDB(db);
  return true;
}

// ─── Rounds ──────────────────────────────────────────────────────────

export async function getRounds(teamId: string) {
  const db = readDB();
  return db.rounds
    .filter((r) => r.team_id === teamId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getRoundByToken(token: string) {
  const db = readDB();
  return db.rounds.find((r) => r.token === token) ?? null;
}

export async function getRoundById(roundId: string) {
  const db = readDB();
  return db.rounds.find((r) => r.id === roundId) ?? null;
}

export async function getRoundQuestions(roundId: string): Promise<(RoundQuestion & { question_text: string })[]> {
  const db = readDB();
  const rqs = db.round_questions
    .filter((rq) => rq.round_id === roundId)
    .sort((a, b) => a.position - b.position);

  return rqs.map((rq) => {
    const q = db.question_bank.find((q) => q.id === rq.question_id);
    return { ...rq, question_text: q?.text ?? "" };
  });
}

export async function createRound(teamId: string) {
  const db = readDB();

  // 1. Get default question set
  const qSet = db.question_set.find(
    (s) => s.team_id === teamId && s.is_default
  );
  if (!qSet) return null;

  const setItems = db.question_set_item
    .filter((i) => i.question_set_id === qSet.id)
    .sort((a, b) => a.position - b.position);

  const fixedItems = setItems.filter((i) => i.kind === "fixed");
  const rotatingPool = setItems.filter((i) => i.kind === "rotating_pool");

  // 2. Pick rotating question
  let rotatingPick = rotatingPool[0] ?? null;
  if (rotatingPool.length > 0) {
    const pastRounds = db.rounds
      .filter((r) => r.team_id === teamId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, rotatingPool.length);

    if (pastRounds.length > 0) {
      const roundIds = new Set(pastRounds.map((r) => r.id));
      const usedIds = new Set(
        db.round_questions
          .filter((rq) => roundIds.has(rq.round_id) && rq.kind === "rotating")
          .map((rq) => rq.question_id)
      );
      const unused = rotatingPool.find((i) => !usedIds.has(i.question_id));
      if (unused) rotatingPick = unused;
    }
  }

  // 3. Create the round
  const round: Round = {
    id: uid(),
    team_id: teamId,
    question_set_id: qSet.id,
    token: uid().slice(0, 12),
    status: "open",
    opens_at: now(),
    closes_at: null,
    created_at: now(),
  };
  db.rounds.push(round);

  // 4. Copy questions into round_questions
  fixedItems.forEach((item, idx) => {
    db.round_questions.push({
      id: uid(),
      round_id: round.id,
      question_id: item.question_id,
      kind: "fixed",
      position: idx + 1,
    });
  });

  if (rotatingPick) {
    db.round_questions.push({
      id: uid(),
      round_id: round.id,
      question_id: rotatingPick.question_id,
      kind: "rotating",
      position: fixedItems.length + 1,
    });
  }

  writeDB(db);
  return round;
}

export async function closeRound(roundId: string) {
  const db = readDB();
  const round = db.rounds.find((r) => r.id === roundId);
  if (!round) return false;
  round.status = "closed";
  round.closes_at = now();
  writeDB(db);
  return true;
}

// ─── Submissions ─────────────────────────────────────────────────────

export async function submitResponses(
  roundId: string,
  answersData: { round_question_id: string; value: number }[],
  freeText?: string,
  clientHash?: string
) {
  const db = readDB();

  const sub = {
    id: uid(),
    round_id: roundId,
    client_hash: clientHash ?? null,
    created_at: now(),
  };
  db.submissions.push(sub);

  for (const a of answersData) {
    db.answers.push({
      id: uid(),
      submission_id: sub.id,
      round_question_id: a.round_question_id,
      value: a.value,
    });
  }

  if (freeText && freeText.trim()) {
    db.free_text.push({
      id: uid(),
      submission_id: sub.id,
      text: freeText.trim(),
      created_at: now(),
    });
  }

  writeDB(db);
  return sub;
}

export async function getSubmissionCount(roundId: string) {
  const db = readDB();
  return db.submissions.filter((s) => s.round_id === roundId).length;
}

// ─── Dashboard Aggregates ────────────────────────────────────────────

function calcStats(values: number[]) {
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return {
    avg: Math.round(avg * 100) / 100,
    spread: Math.round(Math.sqrt(variance) * 100) / 100,
  };
}

export async function getDashboardData(teamId: string, limit = 8): Promise<QuestionAggregate[]> {
  const db = readDB();

  const closedRounds = db.rounds
    .filter((r) => r.team_id === teamId && r.status === "closed")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);

  if (closedRounds.length === 0) return [];

  const results: QuestionAggregate[] = [];

  for (const round of closedRounds) {
    const rqs = db.round_questions
      .filter((rq) => rq.round_id === round.id)
      .sort((a, b) => a.position - b.position);

    for (const rq of rqs) {
      const values = db.answers
        .filter((a) => a.round_question_id === rq.id)
        .map((a) => a.value);

      if (values.length === 0) continue;

      const q = db.question_bank.find((q) => q.id === rq.question_id);
      const { avg, spread } = calcStats(values);

      results.push({
        question_id: rq.question_id,
        question_text: q?.text ?? "",
        round_id: round.id,
        round_created_at: round.created_at,
        avg,
        spread,
        count: values.length,
        values,
      });
    }
  }

  return results;
}

export async function getRoundAggregates(roundId: string): Promise<QuestionAggregate[]> {
  const db = readDB();
  const round = db.rounds.find((r) => r.id === roundId);
  if (!round) return [];

  const rqs = db.round_questions
    .filter((rq) => rq.round_id === roundId)
    .sort((a, b) => a.position - b.position);

  const results: QuestionAggregate[] = [];

  for (const rq of rqs) {
    const values = db.answers
      .filter((a) => a.round_question_id === rq.id)
      .map((a) => a.value);

    if (values.length === 0) continue;

    const q = db.question_bank.find((q) => q.id === rq.question_id);
    const { avg, spread } = calcStats(values);

    results.push({
      question_id: rq.question_id,
      question_text: q?.text ?? "",
      round_id: roundId,
      round_created_at: round.created_at,
      avg,
      spread,
      count: values.length,
      values,
    });
  }

  return results;
}

export async function getPreviousRound(roundId: string): Promise<string | null> {
  const db = readDB();
  const round = db.rounds.find((r) => r.id === roundId);
  if (!round) return null;

  const earlier = db.rounds
    .filter((r) => r.team_id === round.team_id && r.status === "closed" && r.created_at < round.created_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return earlier.length > 0 ? earlier[0].id : null;
}

export async function getFreeTexts(roundId: string) {
  const db = readDB();
  const subIds = new Set(
    db.submissions.filter((s) => s.round_id === roundId).map((s) => s.id)
  );
  return db.free_text
    .filter((ft) => subIds.has(ft.submission_id))
    .map((ft) => ({ text: ft.text, created_at: ft.created_at }));
}
