import {
  readDB, writeDB, uid, now,
  type DB, type Team, type TeamSettings, type Question,
  type QuestionSet, type QuestionSetItem, type Round, type RoundQuestion,
} from "./store";

export type { Team, TeamSettings, Question, QuestionSetItem, Round, RoundQuestion };

// Re-export aggregate type used by dashboard/retro pages
export type QuestionAggregate = {
  question_id: string;
  question_text: string;
  round_id: string;
  round_created_at: string;
  scale_max: number;
  avg: number;
  spread: number;
  count: number;
  values: number[];
};

/**
 * Normalize a raw average to 0–1 range given the scale used.
 * e.g. 2.5 on a 3-point scale → (2.5-1)/(3-1) = 0.75
 */
export function normalizeAvg(avg: number, scaleMax: number): number {
  if (scaleMax <= 1) return 0;
  return (avg - 1) / (scaleMax - 1);
}

/**
 * Normalize a spread (std dev) to 0–1 range given the scale used.
 * Max possible std dev on a scale 1..N is (N-1)/2.
 */
export function normalizeSpread(spread: number, scaleMax: number): number {
  if (scaleMax <= 1) return 0;
  return spread / ((scaleMax - 1) / 2);
}

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

// ─── Team Creation ──────────────────────────────────────────────────

function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return slug || "team";
}

function ensureUniqueSlug(baseSlug: string, db: DB): string {
  let slug = baseSlug;
  let counter = 2;
  while (db.teams.some((t) => t.slug === slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

const DEFAULT_QUESTIONS: { text: string; category: string; kind: "fixed" | "rotating_pool" }[] = [
  { text: "Workload feels sustainable.", category: "workload", kind: "fixed" },
  { text: "I get enough focus time to do good work.", category: "focus", kind: "fixed" },
  { text: "It's clear what matters most right now.", category: "clarity", kind: "fixed" },
  { text: "I understand why we're doing what we're doing.", category: "purpose", kind: "fixed" },
  { text: "I feel comfortable raising concerns in this team.", category: "safety", kind: "rotating_pool" },
  { text: "Decisions are made at a reasonable pace.", category: "pace", kind: "rotating_pool" },
  { text: "I know who to ask when I'm stuck.", category: "collaboration", kind: "rotating_pool" },
  { text: "Meetings feel worthwhile.", category: "meetings", kind: "rotating_pool" },
  { text: "I get useful feedback on my work.", category: "feedback", kind: "rotating_pool" },
  { text: "I have enough energy at the end of the week.", category: "energy", kind: "rotating_pool" },
];

export async function createTeam(name: string) {
  const db = readDB();

  const baseSlug = generateSlug(name);
  const slug = ensureUniqueSlug(baseSlug, db);
  const adminToken = uid().slice(0, 24);

  // 1. Create team
  const team: Team = {
    id: uid(),
    name: name.trim(),
    slug,
    admin_token: adminToken,
    created_at: now(),
  };
  db.teams.push(team);

  // 2. Create default settings
  const settings: TeamSettings = {
    team_id: team.id,
    cadence: "biweekly",
    scale_max: 3,
    min_responses_to_show: 4,
    allow_free_text: true,
  };
  db.team_settings.push(settings);

  // 3. Create questions
  const questions: Question[] = DEFAULT_QUESTIONS.map((q, idx) => ({
    id: uid(),
    team_id: team.id,
    text: q.text,
    category: q.category,
    is_active: true,
    created_at: new Date(Date.now() + idx).toISOString(),
  }));
  db.question_bank.push(...questions);

  // 4. Create question set
  const qSet: QuestionSet = {
    id: uid(),
    team_id: team.id,
    is_default: true,
  };
  db.question_set.push(qSet);

  // 5. Create question set items
  DEFAULT_QUESTIONS.forEach((q, idx) => {
    db.question_set_item.push({
      id: uid(),
      question_set_id: qSet.id,
      question_id: questions[idx].id,
      position: idx + 1,
      kind: q.kind,
    });
  });

  writeDB(db);
  return { team, adminLink: `/admin/${adminToken}` };
}

export async function getAllTeams() {
  const db = readDB();
  return db.teams
    .map((t) => {
      const teamRounds = db.rounds.filter((r) => r.team_id === t.id);
      const roundIds = new Set(teamRounds.map((r) => r.id));
      const submissionCount = db.submissions.filter((s) => roundIds.has(s.round_id)).length;
      const closedRounds = teamRounds
        .filter((r) => r.status === "closed")
        .sort((a, b) => b.created_at.localeCompare(a.created_at));

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        admin_token: t.admin_token,
        created_at: t.created_at,
        roundCount: teamRounds.length,
        submissionCount,
        lastRoundDate: closedRounds[0]?.created_at ?? null,
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
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

export async function moveQuestionInSet(itemId: string, newKind: "fixed" | "rotating_pool") {
  const db = readDB();
  const item = db.question_set_item.find((i) => i.id === itemId);
  if (!item) return false;
  item.kind = newKind;
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

  // 3. Create the round — stamp current scale_max so historical data stays correct
  const settings = db.team_settings.find((s) => s.team_id === teamId);
  const roundScaleMax = settings?.scale_max ?? 3;

  const round: Round = {
    id: uid(),
    team_id: teamId,
    question_set_id: qSet.id,
    token: uid().slice(0, 12),
    status: "open",
    scale_max: roundScaleMax,
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
        scale_max: round.scale_max ?? 3,
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
      scale_max: round.scale_max ?? 3,
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

export async function getAllFreeTexts(teamId: string) {
  const db = readDB();
  const teamRounds = db.rounds
    .filter((r) => r.team_id === teamId && r.status === "closed")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const results: { text: string; created_at: string; round_date: string }[] = [];

  for (const round of teamRounds) {
    const subIds = new Set(
      db.submissions.filter((s) => s.round_id === round.id).map((s) => s.id)
    );
    const texts = db.free_text.filter((ft) => subIds.has(ft.submission_id));
    for (const ft of texts) {
      results.push({
        text: ft.text,
        created_at: ft.created_at,
        round_date: round.created_at,
      });
    }
  }

  // Sort latest first
  results.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return results;
}
