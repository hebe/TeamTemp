-- TX Temp — database schema
-- Run this in your Supabase SQL Editor to set up all tables.

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- ─── Teams ───────────────────────────────────────────────────────────
create table teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  admin_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at  timestamptz not null default now()
);

-- ─── Team Settings ───────────────────────────────────────────────────
create table team_settings (
  team_id              uuid primary key references teams(id) on delete cascade,
  cadence              text not null default 'biweekly' check (cadence in ('weekly','biweekly','monthly')),
  scale_max            int not null default 3 check (scale_max in (3, 4)),
  min_responses_to_show int not null default 4,
  allow_free_text      boolean not null default true
);

-- ─── Question Bank ───────────────────────────────────────────────────
create table question_bank (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams(id) on delete cascade,
  text       text not null,
  category   text not null default 'general',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── Question Sets ───────────────────────────────────────────────────
create table question_set (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references teams(id) on delete cascade,
  name       text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table question_set_item (
  id              uuid primary key default gen_random_uuid(),
  question_set_id uuid not null references question_set(id) on delete cascade,
  question_id     uuid not null references question_bank(id) on delete cascade,
  position        int not null,
  kind            text not null default 'fixed' check (kind in ('fixed','rotating_pool'))
);

-- ─── Rounds ──────────────────────────────────────────────────────────
create table rounds (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references teams(id) on delete cascade,
  question_set_id uuid references question_set(id) on delete set null,
  token           text not null unique default encode(gen_random_bytes(12), 'hex'),
  status          text not null default 'open' check (status in ('open','closed')),
  opens_at        timestamptz not null default now(),
  closes_at       timestamptz,
  created_at      timestamptz not null default now()
);

-- ─── Round Questions (snapshot of questions for this round) ──────────
create table round_questions (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references rounds(id) on delete cascade,
  question_id uuid not null references question_bank(id) on delete cascade,
  kind        text not null default 'fixed' check (kind in ('fixed','rotating')),
  position    int not null
);

-- ─── Submissions & Answers ──────────────────────────────────────────
create table submissions (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references rounds(id) on delete cascade,
  created_at  timestamptz not null default now(),
  client_hash text
);

create table answers (
  id                uuid primary key default gen_random_uuid(),
  submission_id     uuid not null references submissions(id) on delete cascade,
  round_question_id uuid not null references round_questions(id) on delete cascade,
  value             int not null,
  created_at        timestamptz not null default now()
);

create table free_text (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  text          text not null,
  created_at    timestamptz not null default now()
);

-- ─── Round Insights (for future LLM-generated content) ──────────────
create table round_insights (
  id         uuid primary key default gen_random_uuid(),
  round_id   uuid not null references rounds(id) on delete cascade,
  type       text not null,
  content_md text not null,
  created_at timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────
create index idx_question_bank_team on question_bank(team_id);
create index idx_rounds_team on rounds(team_id);
create index idx_rounds_token on rounds(token);
create index idx_round_questions_round on round_questions(round_id);
create index idx_submissions_round on submissions(round_id);
create index idx_answers_submission on answers(submission_id);
