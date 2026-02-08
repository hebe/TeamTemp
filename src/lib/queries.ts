import { supabase } from "./supabase";
import crypto from "crypto";

// ─── Types ──────────────────────────────────────────────────────────
// These mirror the Supabase schema so the rest of the app is unchanged.

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
  const { data } = await supabase
    .from("teams")
    .select("*")
    .eq("slug", slug)
    .single();
  return data ?? null;
}

export async function getTeamByAdminToken(token: string): Promise<Team | null> {
  const { data } = await supabase
    .from("teams")
    .select("*")
    .eq("admin_token", token)
    .single();
  return data ?? null;
}

export async function getTeamByEmail(email: string): Promise<Team | null> {
  const normalized = email.trim().toLowerCase();
  const { data } = await supabase
    .from("teams")
    .select("*")
    .eq("admin_email", normalized)
    .single();
  return data ?? null;
}

export async function getTeamSettings(
  teamId: string
): Promise<TeamSettings | null> {
  const { data } = await supabase
    .from("team_settings")
    .select("*")
    .eq("team_id", teamId)
    .single();
  return data ?? null;
}

export async function updateTeamSettings(
  teamId: string,
  settings: Partial<Omit<TeamSettings, "team_id">>
): Promise<boolean> {
  const { error } = await supabase
    .from("team_settings")
    .update(settings)
    .eq("team_id", teamId);
  return !error;
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
    const { data } = await supabase
      .from("teams")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) break;
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
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .insert({
      name: name.trim(),
      slug,
      admin_token: adminToken,
      admin_email: email.trim().toLowerCase(),
    })
    .select()
    .single();
  if (teamErr || !team)
    throw new Error(teamErr?.message ?? "Failed to create team");

  // 2. Create default settings
  await supabase.from("team_settings").insert({
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
  const { data: questions } = await supabase
    .from("question_bank")
    .insert(questionRows)
    .select();
  if (!questions) throw new Error("Failed to create questions");

  // 4. Create question set
  const { data: qSet } = await supabase
    .from("question_set")
    .insert({ team_id: team.id, is_default: true })
    .select()
    .single();
  if (!qSet) throw new Error("Failed to create question set");

  // 5. Create question set items
  const setItems = DEFAULT_QUESTIONS.map((q, idx) => ({
    question_set_id: qSet.id,
    question_id: questions[idx].id,
    position: idx + 1,
    kind: q.kind,
  }));
  await supabase.from("question_set_item").insert(setItems);

  return { team: team as Team, adminLink: `/admin/${adminToken}` };
}

export async function getAllTeams() {
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false });
  if (!teams) return [];

  const results = [];
  for (const t of teams) {
    // Count rounds
    const { count: roundCount } = await supabase
      .from("rounds")
      .select("*", { count: "exact", head: true })
      .eq("team_id", t.id);

    // Count submissions across all rounds
    const { data: teamRounds } = await supabase
      .from("rounds")
      .select("id")
      .eq("team_id", t.id);
    const roundIds = (teamRounds ?? []).map((r: { id: string }) => r.id);

    let submissionCount = 0;
    if (roundIds.length > 0) {
      const { count } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .in("round_id", roundIds);
      submissionCount = count ?? 0;
    }

    // Last closed round date
    const { data: lastClosed } = await supabase
      .from("rounds")
      .select("created_at")
      .eq("team_id", t.id)
      .eq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(1);

    results.push({
      id: t.id,
      name: t.name,
      slug: t.slug,
      admin_token: t.admin_token,
      admin_email: t.admin_email,
      created_at: t.created_at,
      roundCount: roundCount ?? 0,
      submissionCount,
      lastRoundDate: lastClosed?.[0]?.created_at ?? null,
    });
  }

  return results;
}

// ─── Questions ──────────────────────────────────────────────────────

export async function getQuestions(teamId: string): Promise<Question[]> {
  const { data } = await supabase
    .from("question_bank")
    .select("*")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  return (data as Question[]) ?? [];
}

export async function getDefaultQuestionSet(teamId: string) {
  const { data: qs } = await supabase
    .from("question_set")
    .select("*")
    .eq("team_id", teamId)
    .eq("is_default", true)
    .single();
  if (!qs) return null;

  const { data: rawItems } = await supabase
    .from("question_set_item")
    .select("*, question:question_bank(*)")
    .eq("question_set_id", qs.id)
    .order("position", { ascending: true });

  const items = (rawItems ?? []).map(
    (item: QuestionSetItem & { question: Question | null }) => ({
      id: item.id,
      question_set_id: item.question_set_id,
      question_id: item.question_id,
      position: item.position,
      kind: item.kind,
      question: item.question ?? undefined,
    })
  );

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
  const { data, error } = await supabase
    .from("question_bank")
    .insert({ team_id: teamId, text, category, is_active: true })
    .select()
    .single();
  if (error || !data)
    throw new Error(error?.message ?? "Failed to add question");
  return data as Question;
}

export async function addQuestionToSet(
  questionSetId: string,
  questionId: string,
  position: number,
  kind: "fixed" | "rotating_pool"
): Promise<boolean> {
  const { error } = await supabase.from("question_set_item").insert({
    question_set_id: questionSetId,
    question_id: questionId,
    position,
    kind,
  });
  return !error;
}

export async function removeQuestionFromSet(itemId: string): Promise<boolean> {
  const { error } = await supabase
    .from("question_set_item")
    .delete()
    .eq("id", itemId);
  return !error;
}

export async function moveQuestionInSet(
  itemId: string,
  newKind: "fixed" | "rotating_pool"
): Promise<boolean> {
  const { error } = await supabase
    .from("question_set_item")
    .update({ kind: newKind })
    .eq("id", itemId);
  return !error;
}

export async function deactivateQuestion(questionId: string): Promise<boolean> {
  const { error } = await supabase
    .from("question_bank")
    .update({ is_active: false })
    .eq("id", questionId);
  return !error;
}

// ─── Rounds ─────────────────────────────────────────────────────────

export async function getRounds(teamId: string): Promise<Round[]> {
  const { data } = await supabase
    .from("rounds")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });
  return (data as Round[]) ?? [];
}

export async function getRoundByToken(token: string): Promise<Round | null> {
  const { data } = await supabase
    .from("rounds")
    .select("*")
    .eq("token", token)
    .single();
  return (data as Round) ?? null;
}

export async function getRoundById(roundId: string): Promise<Round | null> {
  const { data } = await supabase
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .single();
  return (data as Round) ?? null;
}

export async function getRoundQuestions(
  roundId: string
): Promise<(RoundQuestion & { question_text: string })[]> {
  const { data } = await supabase
    .from("round_questions")
    .select("*, question:question_bank(text)")
    .eq("round_id", roundId)
    .order("position", { ascending: true });

  return (data ?? []).map(
    (rq: RoundQuestion & { question: { text: string } | null }) => ({
      id: rq.id,
      round_id: rq.round_id,
      question_id: rq.question_id,
      kind: rq.kind,
      position: rq.position,
      question_text: rq.question?.text ?? "",
    })
  );
}

export async function createRound(teamId: string): Promise<Round | null> {
  // 1. Get default question set
  const { data: qSet } = await supabase
    .from("question_set")
    .select("id")
    .eq("team_id", teamId)
    .eq("is_default", true)
    .single();
  if (!qSet) return null;

  const { data: setItems } = await supabase
    .from("question_set_item")
    .select("*")
    .eq("question_set_id", qSet.id)
    .order("position", { ascending: true });
  if (!setItems) return null;

  const fixedItems = setItems.filter(
    (i: QuestionSetItem) => i.kind === "fixed"
  );
  const rotatingPool = setItems.filter(
    (i: QuestionSetItem) => i.kind === "rotating_pool"
  );

  // 2. Pick rotating question (avoid recently used)
  let rotatingPick = rotatingPool[0] ?? null;
  if (rotatingPool.length > 0) {
    const { data: pastRounds } = await supabase
      .from("rounds")
      .select("id")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(rotatingPool.length);

    if (pastRounds && pastRounds.length > 0) {
      const roundIds = pastRounds.map((r: { id: string }) => r.id);
      const { data: usedRqs } = await supabase
        .from("round_questions")
        .select("question_id")
        .in("round_id", roundIds)
        .eq("kind", "rotating");

      const usedIds = new Set(
        (usedRqs ?? []).map(
          (rq: { question_id: string }) => rq.question_id
        )
      );
      const unused = rotatingPool.find(
        (i: QuestionSetItem) => !usedIds.has(i.question_id)
      );
      if (unused) rotatingPick = unused;
    }
  }

  // 3. Create round with scale_max snapshot
  const settings = await getTeamSettings(teamId);
  const roundScaleMax = settings?.scale_max ?? 3;
  const token = uid().slice(0, 12);

  const { data: round, error: roundErr } = await supabase
    .from("rounds")
    .insert({
      team_id: teamId,
      question_set_id: qSet.id,
      token,
      status: "open",
      scale_max: roundScaleMax,
    })
    .select()
    .single();
  if (roundErr || !round) return null;

  // 4. Insert round_questions
  const rqRows = fixedItems.map((item: QuestionSetItem, idx: number) => ({
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

  await supabase.from("round_questions").insert(rqRows);

  return round as Round;
}

export async function closeRound(roundId: string): Promise<boolean> {
  const { error } = await supabase
    .from("rounds")
    .update({ status: "closed", closes_at: new Date().toISOString() })
    .eq("id", roundId);
  return !error;
}

// ─── Submissions ────────────────────────────────────────────────────

export async function submitResponses(
  roundId: string,
  answersData: { round_question_id: string; value: number }[],
  freeText?: string,
  clientHash?: string
) {
  // 1. Insert submission
  const { data: sub, error: subErr } = await supabase
    .from("submissions")
    .insert({
      round_id: roundId,
      client_hash: clientHash ?? null,
    })
    .select()
    .single();
  if (subErr || !sub)
    throw new Error(subErr?.message ?? "Failed to create submission");

  // 2. Insert answers
  const answerRows = answersData.map((a) => ({
    submission_id: sub.id,
    round_question_id: a.round_question_id,
    value: a.value,
  }));
  await supabase.from("answers").insert(answerRows);

  // 3. Insert free text if provided
  if (freeText && freeText.trim()) {
    await supabase.from("free_text").insert({
      submission_id: sub.id,
      text: freeText.trim(),
    });
  }

  return sub;
}

export async function getSubmissionCount(roundId: string): Promise<number> {
  const { count } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("round_id", roundId);
  return count ?? 0;
}

// ─── Dashboard Aggregates ───────────────────────────────────────────

export async function getDashboardData(
  teamId: string,
  limit = 8
): Promise<QuestionAggregate[]> {
  // Get last N closed rounds
  const { data: closedRounds } = await supabase
    .from("rounds")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!closedRounds || closedRounds.length === 0) return [];

  const results: QuestionAggregate[] = [];

  for (const round of closedRounds) {
    // Get round questions with question text
    const { data: rqs } = await supabase
      .from("round_questions")
      .select("*, question:question_bank(text)")
      .eq("round_id", round.id)
      .order("position", { ascending: true });

    if (!rqs) continue;

    for (const rq of rqs) {
      // Get all answer values for this round_question
      const { data: answerRows } = await supabase
        .from("answers")
        .select("value")
        .eq("round_question_id", rq.id);

      const values = (answerRows ?? []).map(
        (a: { value: number }) => a.value
      );
      if (values.length === 0) continue;

      const { avg, spread } = calcStats(values);
      const questionText =
        (rq as RoundQuestion & { question: { text: string } | null })
          .question?.text ?? "";

      results.push({
        question_id: rq.question_id,
        question_text: questionText,
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

  const { data: rqs } = await supabase
    .from("round_questions")
    .select("*, question:question_bank(text)")
    .eq("round_id", roundId)
    .order("position", { ascending: true });

  if (!rqs) return [];

  const results: QuestionAggregate[] = [];

  for (const rq of rqs) {
    const { data: answerRows } = await supabase
      .from("answers")
      .select("value")
      .eq("round_question_id", rq.id);

    const values = (answerRows ?? []).map(
      (a: { value: number }) => a.value
    );
    if (values.length === 0) continue;

    const { avg, spread } = calcStats(values);
    const questionText =
      (rq as RoundQuestion & { question: { text: string } | null })
        .question?.text ?? "";

    results.push({
      question_id: rq.question_id,
      question_text: questionText,
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

  const { data } = await supabase
    .from("rounds")
    .select("id")
    .eq("team_id", round.team_id)
    .eq("status", "closed")
    .lt("created_at", round.created_at)
    .order("created_at", { ascending: false })
    .limit(1);

  return data?.[0]?.id ?? null;
}

export async function getFreeTexts(roundId: string) {
  // Get submission IDs for this round
  const { data: subs } = await supabase
    .from("submissions")
    .select("id")
    .eq("round_id", roundId);
  if (!subs || subs.length === 0) return [];

  const subIds = subs.map((s: { id: string }) => s.id);

  const { data } = await supabase
    .from("free_text")
    .select("text, created_at")
    .in("submission_id", subIds);

  return (data ?? []).map((ft: { text: string; created_at: string }) => ({
    text: ft.text,
    created_at: ft.created_at,
  }));
}

export async function getAllFreeTexts(teamId: string) {
  // Get all closed rounds for this team
  const { data: teamRounds } = await supabase
    .from("rounds")
    .select("id, created_at")
    .eq("team_id", teamId)
    .eq("status", "closed")
    .order("created_at", { ascending: false });

  if (!teamRounds || teamRounds.length === 0) return [];

  const roundIds = teamRounds.map((r: { id: string }) => r.id);
  const roundDateMap = new Map(
    teamRounds.map((r: { id: string; created_at: string }) => [
      r.id,
      r.created_at,
    ])
  );

  // Get all submissions for these rounds
  const { data: subs } = await supabase
    .from("submissions")
    .select("id, round_id")
    .in("round_id", roundIds);
  if (!subs || subs.length === 0) return [];

  const subIds = subs.map((s: { id: string }) => s.id);
  const subRoundMap = new Map(
    subs.map((s: { id: string; round_id: string }) => [s.id, s.round_id])
  );

  // Get all free texts
  const { data: texts } = await supabase
    .from("free_text")
    .select("text, created_at, submission_id")
    .in("submission_id", subIds)
    .order("created_at", { ascending: false });

  return (texts ?? []).map(
    (ft: { text: string; created_at: string; submission_id: string }) => {
      const roundId = subRoundMap.get(ft.submission_id) ?? "";
      return {
        text: ft.text,
        created_at: ft.created_at,
        round_date: roundDateMap.get(roundId) ?? "",
      };
    }
  );
}
