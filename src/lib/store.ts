/**
 * Local JSON-file data store — replaces Supabase for offline development.
 *
 * Data lives in /data/db.json at the project root.
 * Every write persists immediately (sync, because we're on a local dev server).
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

// ─── Path ────────────────────────────────────────────────────────────
const DB_PATH = path.join(process.cwd(), "data", "db.json");

// ─── Types ───────────────────────────────────────────────────────────
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

export type QuestionSet = {
  id: string;
  team_id: string;
  is_default: boolean;
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

export type Submission = {
  id: string;
  round_id: string;
  client_hash: string | null;
  created_at: string;
};

export type Answer = {
  id: string;
  submission_id: string;
  round_question_id: string;
  value: number;
};

export type FreeText = {
  id: string;
  submission_id: string;
  text: string;
  created_at: string;
};

export type DB = {
  teams: Team[];
  team_settings: TeamSettings[];
  question_bank: Question[];
  question_set: QuestionSet[];
  question_set_item: QuestionSetItem[];
  rounds: Round[];
  round_questions: RoundQuestion[];
  submissions: Submission[];
  answers: Answer[];
  free_text: FreeText[];
};

// ─── Helpers ─────────────────────────────────────────────────────────

export function uid(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

function emptyDB(): DB {
  return {
    teams: [],
    team_settings: [],
    question_bank: [],
    question_set: [],
    question_set_item: [],
    rounds: [],
    round_questions: [],
    submissions: [],
    answers: [],
    free_text: [],
  };
}

// ─── Read / Write ────────────────────────────────────────────────────

export function readDB(): DB {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw) as DB;
  } catch {
    return emptyDB();
  }
}

export function writeDB(db: DB): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}
