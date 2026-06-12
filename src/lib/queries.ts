import { db } from "./db";
import {
  teams,
  teamSettings,
  questionBank,
  questionSet,
  questionSetItem,
  rounds,
  roundQuestions,
  submissions,
  answers,
  freeTextTable,
} from "./schema";
import { eq, and, inArray, lt, asc, desc, count } from "drizzle-orm";
import crypto from "crypto";

// ─── Types ──────────────────────────────────────────────────────────
// These mirror the database schema so the rest of the app is unchanged.

export type Team = {
  id: string;
  name: string;
  slug: string;
  admin_token: string;
  admin_email: string;
  created_at: string;
};

export type TeamSettings = {
  team_id: string;
  cadence: "weekly" | "biweekly" | "monthly";
  scale_max: 3 | 4 | 5;
  min_responses_to_show: number;
  allow_free_text: boolean;
};

export type Question = {
  id: string;
  team_id: string;
  text: string;
  category: string;
  is_active: boolean;
  created_at: string;
};

export type QuestionSetItem = {
  id: string;
  question_set_id: string;
  question_id: string;
  position: number;
  kind: "fixed" | "rotating_pool";
};

export type Round = {
  id: string;
  team_id: string;
  question_set_id: string | null;
  token: string;
  status: "open" | "closed";
  scale_max: number;
  opens_at: string;
  closes_at: string | null;
  created_at: string;
};

export type RoundQuestion = {
  id: string;
  round_id: string;
  question_id: string;
  kind: "fixed" | "rotating";
  position: number;
};

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

// ─── Helpers ────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID();
}

function calcStats(values: number[]) {
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return {
    avg: Math.round(avg * 100) / 100,
    spread: Math.round(Math.sqrt(variance) * 100) / 100,
  };
}

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

// ─── Team Lookups ───────────────────────────────────────────────────

export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.slug, slug))
    .limit(1);
  return (team as Team) ?? null;
}

export async function getTeamByAdminToken(token: string): Promise<Team | null> {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.admin_token, token))
    .limit(1);
  return (team as Team) ?? null;
}

export async function getTeamByEmail(email: string): Promise<Team | null> {
  const normalized = email.trim().toLowerCase();
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.admin_email, normalized))
    .limit(1);
  return (team as Team) ?? null;
}

export async function getTeamSettings(
  teamId: string
): Promise<TeamSettings | null> {
  const [settings] = await db
    .select()
    .from(teamSettings)
    .where(eq(teamSettings.team_id, teamId))
    .limit(1);
  if (!settings) return null;
  return settings as TeamSettings;
}

export async function updateTeamSettings(
  teamId: string,
  settings: Partial<Omit<TeamSettings, "team_id">>
): Promise<boolean> {
  try {
    await db
      .update(teamSettings)
      .set(settings)
      .where(eq(teamSettings.team_id, teamId));
    return true;
  } catch {
    return false;
  }
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

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [existing] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.slug, slug))
      .limit(1);
    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

const DEFAULT_QUESTIONS: {
  text: string;
  category: string;
  kind: "fixed" | "rotating_pool";
}[] = [
  {
    text: "Workload feels sustainable.",
    category: "workload",
    kind: "fixed",
  },
  {
    text: "I get enough focus time to do good work.",
    category: "focus",
    kind: "fixed",
  },
  {
    text: "It's clear what matters most right now.",
    category: "clarity",
    kind: "fixed",
  },
  {
    text: "I understand why we're doing what we're doing.",
    category: "purpose",
    kind: "fixed",
  },
  {
    text: "I feel comfortable raising concerns in this team.",
    category: "safety",
    kind: "rotating_pool",
  },
  {
    text: "Decisions are made at a reasonable pace.",
    category: "pace",
    kind: "rotating_pool",
  },
  {
    text: "I know who to ask when I'm stuck.",
    category: "collaboration",
    kind: "rotating_pool",
  },
  {
    text: "Meetings feel worthwhile.",
    category: "meetings",
    kind: "rotating_pool",
  },
  {
    text: "I get useful feedback on my work.",
    category: "feedback",
    kind: "rotating_pool",
  },
  {
    text: "I have enough energy at the end of the week.",
    category: "energy",
    kind: "rotating_pool",
  },
];

export async function createTeam(name: string, email: string) {
  const baseSlug = generateSlug(name);
  const slug = await ensureUniqueSlug(baseSlug);
  const adminToken = uid().slice(0, 24);

  // 1. Create team
  const [team] = await db
    .insert(teams)
    .values({
      name: name.trim(),
      slug,
      admin_token: adminToken,
      admin_email: email.trim().toLowerCase(),
    })
    .returning();
  if (!team) throw new Error("Failed to create team");

  // 2. Create default settings
  await db.insert(teamSettings).values({
    team_id: team.id,
    cadence: "biweekly",
    scale_max: 3,
    min_responses_to_show: 4,
    allow_free_text: true,
  });

  // 3. Create questions
  const questionRows = DEFAULT_QUESTIONS.map((q) => ({
    team_id: team.id,
    text: q.text,
    category: q.category,
    is_active: true,
  }));
  const questions = await db
    .insert(questionBank)
    .values(questionRows)
    .returning();
  if (!questions.length) throw new Error("Failed to create questions");

  // 4. Create question set
  const [qSet] = await db
    .insert(questionSet)
    .values({ team_id: team.id, is_default: true })
    .returning();
  if (!qSet) throw new Error("Failed to create question set");

  // 5. Create question set items
  const setItems = DEFAULT_QUESTIONS.map((q, idx) => ({
    question_set_id: qSet.id,
    question_id: questions[idx].id,
    position: idx + 1,
    kind: q.kind,
  }));
  await db.insert(questionSetItem).values(setItems);

  return { team: team as Team, adminLink: `/admin/${adminToken}` };
}

export async function getAllTeams() {
  const allTeams = await db
    .select()
    .from(teams)
    .orderBy(desc(teams.created_at));
  if (!allTeams.length) return [];

  const results = [];
  for (const t of allTeams) {
    const [{ value: roundCount }] = await db
      .select({ value: count() })
      .from(rounds)
      .where(eq(rounds.team_id, t.id));

    const teamRounds = await db
      .select({ id: rounds.id })
      .from(rounds)
      .where(eq(rounds.team_id, t.id));
    const roundIds = teamRounds.map((r) => r.id);

    let submissionCount = 0;
    if (roundIds.length > 0) {
      const [{ value }] = await db
        .select({ value: count() })
        .from(submissions)
        .where(inArray(submissions.round_id, roundIds));
      submissionCount = value;
    }

    const lastClosed = await db
      .select({ created_at: rounds.created_at })
      .from(rounds)
      .where(and(eq(rounds.team_id, t.id), eq(rounds.status, "closed")))
      .orderBy(desc(rounds.created_at))
      .limit(1);

    results.push({
      id: t.id,
      name: t.name,
      slug: t.slug,
      admin_token: t.admin_token,
      admin_email: t.admin_email,
      created_at: t.created_at,
      roundCount,
      submissionCount,
      lastRoundDate: lastClosed[0]?.created_at ?? null,
    });
  }

  return results;
}

// ─── Questions ──────────────────────────────────────────────────────

export async function getQuestions(teamId: string): Promise<Question[]> {
  const rows = await db
    .select()
    .from(questionBank)
    .where(
      and(eq(questionBank.team_id, teamId), eq(questionBank.is_active, true))
    )
    .orderBy(asc(questionBank.created_at));
  return rows as Question[];
}

export async function getDefaultQuestionSet(teamId: string) {
  const [qs] = await db
    .select()
    .from(questionSet)
    .where(
      and(eq(questionSet.team_id, teamId), eq(questionSet.is_default, true))
    )
    .limit(1);
  if (!qs) return null;

  const rawItems = await db
    .select({
      id: questionSetItem.id,
      question_set_id: questionSetItem.question_set_id,
      question_id: questionSetItem.question_id,
      position: questionSetItem.position,
      kind: questionSetItem.kind,
      question: {
        id: questionBank.id,
        team_id: questionBank.team_id,
        text: questionBank.text,
        category: questionBank.category,
        is_active: questionBank.is_active,
        created_at: questionBank.created_at,
      },
    })
    .from(questionSetItem)
    .leftJoin(questionBank, eq(questionSetItem.question_id, questionBank.id))
    .where(eq(questionSetItem.question_set_id, qs.id))
    .orderBy(asc(questionSetItem.position));

  const items = rawItems.map((item) => ({
    id: item.id,
    question_set_id: item.question_set_id,
    question_id: item.question_id,
    position: item.position,
    kind: item.kind as "fixed" | "rotating_pool",
    question: item.question ?? undefined,
  }));

  return { ...qs, items } as {
    id: string;
    team_id: string;
    is_default: boolean;
    items: (QuestionSetItem & { question?: Question })[];
  };
}

export async function addQuestion(
  teamId: string,
  text: string,
  category: string
): Promise<Question> {
  const [row] = await db
    .insert(questionBank)
    .values({ team_id: teamId, text, category, is_active: true })
    .returning();
  if (!row) throw new Error("Failed to add question");
  return row as Question;
}

export async function addQuestionToSet(
  questionSetId: string,
  questionId: string,
  position: number,
  kind: "fixed" | "rotating_pool"
): Promise<boolean> {
  try {
    await db.insert(questionSetItem).values({
      question_set_id: questionSetId,
      question_id: questionId,
      position,
      kind,
    });
    return true;
  } catch {
    return false;
  }
}

export async function removeQuestionFromSet(itemId: string): Promise<boolean> {
  try {
    await db
      .delete(questionSetItem)
      .where(eq(questionSetItem.id, itemId));
    return true;
  } catch {
    return false;
  }
}

export async function moveQuestionInSet(
  itemId: string,
  newKind: "fixed" | "rotating_pool"
): Promise<boolean> {
  try {
    await db
      .update(questionSetItem)
      .set({ kind: newKind })
      .where(eq(questionSetItem.id, itemId));
    return true;
  } catch {
    return false;
  }
}

export async function deactivateQuestion(questionId: string): Promise<boolean> {
  try {
    await db
      .update(questionBank)
      .set({ is_active: false })
      .where(eq(questionBank.id, questionId));
    return true;
  } catch {
    return false;
  }
}

// ─── Rounds ─────────────────────────────────────────────────────────

export async function getRounds(teamId: string): Promise<Round[]> {
  const rows = await db
    .select()
    .from(rounds)
    .where(eq(rounds.team_id, teamId))
    .orderBy(desc(rounds.created_at));
  return rows as Round[];
}

export async function getRoundByToken(token: string): Promise<Round | null> {
  const [row] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.token, token))
    .limit(1);
  return (row as Round) ?? null;
}

export async function getRoundById(roundId: string): Promise<Round | null> {
  const [row] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1);
  return (row as Round) ?? null;
}

export async function getRoundQuestions(
  roundId: string
): Promise<(RoundQuestion & { question_text: string })[]> {
  const rows = await db
    .select({
      id: roundQuestions.id,
      round_id: roundQuestions.round_id,
      question_id: roundQuestions.question_id,
      kind: roundQuestions.kind,
      position: roundQuestions.position,
      question_text: questionBank.text,
    })
    .from(roundQuestions)
    .leftJoin(questionBank, eq(roundQuestions.question_id, questionBank.id))
    .where(eq(roundQuestions.round_id, roundId))
    .orderBy(asc(roundQuestions.position));

  return rows.map((rq) => ({
    id: rq.id,
    round_id: rq.round_id,
    question_id: rq.question_id,
    kind: rq.kind as "fixed" | "rotating",
    position: rq.position,
    question_text: rq.question_text ?? "",
  }));
}

export async function createRound(teamId: string): Promise<Round | null> {
  // 1. Get default question set
  const [qSet] = await db
    .select({ id: questionSet.id })
    .from(questionSet)
    .where(
      and(eq(questionSet.team_id, teamId), eq(questionSet.is_default, true))
    )
    .limit(1);
  if (!qSet) return null;

  const setItems = await db
    .select()
    .from(questionSetItem)
    .where(eq(questionSetItem.question_set_id, qSet.id))
    .orderBy(asc(questionSetItem.position));
  if (!setItems.length) return null;

  const fixedItems = setItems.filter((i) => i.kind === "fixed");
  const rotatingPool = setItems.filter((i) => i.kind === "rotating_pool");

  // 2. Pick rotating question (avoid recently used)
  let rotatingPick = rotatingPool[0] ?? null;
  if (rotatingPool.length > 0) {
    const pastRounds = await db
      .select({ id: rounds.id })
      .from(rounds)
      .where(eq(rounds.team_id, teamId))
      .orderBy(desc(rounds.created_at))
      .limit(rotatingPool.length);

    if (pastRounds.length > 0) {
      const roundIds = pastRounds.map((r) => r.id);
      const usedRqs = await db
        .select({ question_id: roundQuestions.question_id })
        .from(roundQuestions)
        .where(
          and(
            inArray(roundQuestions.round_id, roundIds),
            eq(roundQuestions.kind, "rotating")
          )
        );

      const usedIds = new Set(usedRqs.map((rq) => rq.question_id));
      const unused = rotatingPool.find((i) => !usedIds.has(i.question_id));
      if (unused) rotatingPick = unused;
    }
  }

  // 3. Create round with scale_max snapshot
  const settings = await getTeamSettings(teamId);
  const roundScaleMax = settings?.scale_max ?? 3;
  const token = uid().slice(0, 12);

  const [round] = await db
    .insert(rounds)
    .values({
      team_id: teamId,
      question_set_id: qSet.id,
      token,
      status: "open",
      scale_max: roundScaleMax,
    })
    .returning();
  if (!round) return null;

  // 4. Insert round_questions
  const rqRows: {
    round_id: string;
    question_id: string;
    kind: string;
    position: number;
  }[] = fixedItems.map((item, idx) => ({
    round_id: round.id,
    question_id: item.question_id,
    kind: "fixed",
    position: idx + 1,
  }));

  if (rotatingPick) {
    rqRows.push({
      round_id: round.id,
      question_id: rotatingPick.question_id,
      kind: "rotating",
      position: fixedItems.length + 1,
    });
  }

  await db.insert(roundQuestions).values(rqRows);

  return round as Round;
}

export async function closeRound(roundId: string): Promise<boolean> {
  try {
    await db
      .update(rounds)
      .set({ status: "closed", closes_at: new Date().toISOString() })
      .where(eq(rounds.id, roundId));
    return true;
  } catch {
    return false;
  }
}

// ─── Submissions ────────────────────────────────────────────────────

export async function submitResponses(
  roundId: string,
  answersData: { round_question_id: string; value: number }[],
  freeText?: string,
  clientHash?: string
) {
  // 1. Insert submission
  const [sub] = await db
    .insert(submissions)
    .values({ round_id: roundId, client_hash: clientHash ?? null })
    .returning();
  if (!sub) throw new Error("Failed to create submission");

  // 2. Insert answers
  const answerRows = answersData.map((a) => ({
    submission_id: sub.id,
    round_question_id: a.round_question_id,
    value: a.value,
  }));
  await db.insert(answers).values(answerRows);

  // 3. Insert free text if provided
  if (freeText && freeText.trim()) {
    await db.insert(freeTextTable).values({
      submission_id: sub.id,
      text: freeText.trim(),
    });
  }

  return sub;
}

export async function getSubmissionCount(roundId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(submissions)
    .where(eq(submissions.round_id, roundId));
  return value;
}

// ─── Dashboard Aggregates ───────────────────────────────────────────

export async function getDashboardData(
  teamId: string,
  limit = 8
): Promise<QuestionAggregate[]> {
  const closedRounds = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.team_id, teamId), eq(rounds.status, "closed")))
    .orderBy(desc(rounds.created_at))
    .limit(limit);

  if (!closedRounds.length) return [];

  const results: QuestionAggregate[] = [];

  for (const round of closedRounds) {
    const rqs = await db
      .select({
        id: roundQuestions.id,
        round_id: roundQuestions.round_id,
        question_id: roundQuestions.question_id,
        kind: roundQuestions.kind,
        position: roundQuestions.position,
        question_text: questionBank.text,
      })
      .from(roundQuestions)
      .leftJoin(questionBank, eq(roundQuestions.question_id, questionBank.id))
      .where(eq(roundQuestions.round_id, round.id))
      .orderBy(asc(roundQuestions.position));

    for (const rq of rqs) {
      const answerRows = await db
        .select({ value: answers.value })
        .from(answers)
        .where(eq(answers.round_question_id, rq.id));

      const values = answerRows.map((a) => a.value);
      if (values.length === 0) continue;

      const { avg, spread } = calcStats(values);

      results.push({
        question_id: rq.question_id,
        question_text: rq.question_text ?? "",
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

export async function getRoundAggregates(
  roundId: string
): Promise<QuestionAggregate[]> {
  const round = await getRoundById(roundId);
  if (!round) return [];

  const rqs = await db
    .select({
      id: roundQuestions.id,
      round_id: roundQuestions.round_id,
      question_id: roundQuestions.question_id,
      kind: roundQuestions.kind,
      position: roundQuestions.position,
      question_text: questionBank.text,
    })
    .from(roundQuestions)
    .leftJoin(questionBank, eq(roundQuestions.question_id, questionBank.id))
    .where(eq(roundQuestions.round_id, roundId))
    .orderBy(asc(roundQuestions.position));

  const results: QuestionAggregate[] = [];

  for (const rq of rqs) {
    const answerRows = await db
      .select({ value: answers.value })
      .from(answers)
      .where(eq(answers.round_question_id, rq.id));

    const values = answerRows.map((a) => a.value);
    if (values.length === 0) continue;

    const { avg, spread } = calcStats(values);

    results.push({
      question_id: rq.question_id,
      question_text: rq.question_text ?? "",
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

export async function getPreviousRound(
  roundId: string
): Promise<string | null> {
  const round = await getRoundById(roundId);
  if (!round) return null;

  const [prev] = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(
      and(
        eq(rounds.team_id, round.team_id),
        eq(rounds.status, "closed"),
        lt(rounds.created_at, round.created_at)
      )
    )
    .orderBy(desc(rounds.created_at))
    .limit(1);

  return prev?.id ?? null;
}

export async function getFreeTexts(roundId: string) {
  const subs = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(eq(submissions.round_id, roundId));
  if (!subs.length) return [];

  const subIds = subs.map((s) => s.id);

  const rows = await db
    .select({ text: freeTextTable.text, created_at: freeTextTable.created_at })
    .from(freeTextTable)
    .where(inArray(freeTextTable.submission_id, subIds));

  return rows.map((ft) => ({ text: ft.text, created_at: ft.created_at }));
}

export async function getAllFreeTexts(teamId: string) {
  const teamRounds = await db
    .select({ id: rounds.id, created_at: rounds.created_at })
    .from(rounds)
    .where(and(eq(rounds.team_id, teamId), eq(rounds.status, "closed")))
    .orderBy(desc(rounds.created_at));

  if (!teamRounds.length) return [];

  const roundIds = teamRounds.map((r) => r.id);
  const roundDateMap = new Map(teamRounds.map((r) => [r.id, r.created_at]));

  const subs = await db
    .select({ id: submissions.id, round_id: submissions.round_id })
    .from(submissions)
    .where(inArray(submissions.round_id, roundIds));
  if (!subs.length) return [];

  const subIds = subs.map((s) => s.id);
  const subRoundMap = new Map(subs.map((s) => [s.id, s.round_id]));

  const texts = await db
    .select({
      text: freeTextTable.text,
      created_at: freeTextTable.created_at,
      submission_id: freeTextTable.submission_id,
    })
    .from(freeTextTable)
    .where(inArray(freeTextTable.submission_id, subIds))
    .orderBy(desc(freeTextTable.created_at));

  return texts.map((ft) => {
    const roundId = subRoundMap.get(ft.submission_id) ?? "";
    return {
      text: ft.text,
      created_at: ft.created_at,
      round_date: roundDateMap.get(roundId) ?? "",
    };
  });
}
