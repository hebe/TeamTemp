-- TX Temp — seed data
-- Creates demo team "Texty Beasts" with questions and sample rounds.
-- Run this AFTER schema.sql in the Supabase SQL Editor.

-- ─── Create Team ─────────────────────────────────────────────────────
insert into teams (id, name, slug, admin_token)
values (
  '11111111-1111-1111-1111-111111111111',
  'Texty Beasts',
  'tx',
  'demo-admin-token-abc123'
);

insert into team_settings (team_id, cadence, scale_max, min_responses_to_show, allow_free_text)
values ('11111111-1111-1111-1111-111111111111', 'biweekly', 3, 4, true);

-- ─── Fixed Questions (4) ─────────────────────────────────────────────
insert into question_bank (id, team_id, text, category, is_active) values
  ('aaaa0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Workload feels sustainable.', 'workload', true),
  ('aaaa0002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'I get enough focus time to do good work.', 'focus', true),
  ('aaaa0003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'It''s clear what matters most right now.', 'clarity', true),
  ('aaaa0004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'I understand why we''re doing what we''re doing.', 'purpose', true);

-- ─── Rotating Pool Questions (6) ────────────────────────────────────
insert into question_bank (id, team_id, text, category, is_active) values
  ('bbbb0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'I feel comfortable raising concerns in this team.', 'safety', true),
  ('bbbb0002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Decisions are made at a reasonable pace.', 'pace', true),
  ('bbbb0003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'I know who to ask when I''m stuck.', 'collaboration', true),
  ('bbbb0004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Meetings feel worthwhile.', 'meetings', true),
  ('bbbb0005-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'I have what I need to do my job well.', 'resources', true),
  ('bbbb0006-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Our team celebrates small wins.', 'morale', true);

-- ─── Default Question Set ────────────────────────────────────────────
insert into question_set (id, team_id, name, is_default) values
  ('cccc0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Default Set', true);

-- Fixed items (position 1-4)
insert into question_set_item (question_set_id, question_id, position, kind) values
  ('cccc0001-0000-0000-0000-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 1, 'fixed'),
  ('cccc0001-0000-0000-0000-000000000001', 'aaaa0002-0000-0000-0000-000000000002', 2, 'fixed'),
  ('cccc0001-0000-0000-0000-000000000001', 'aaaa0003-0000-0000-0000-000000000003', 3, 'fixed'),
  ('cccc0001-0000-0000-0000-000000000001', 'aaaa0004-0000-0000-0000-000000000004', 4, 'fixed');

-- Rotating pool items (position 5-10)
insert into question_set_item (question_set_id, question_id, position, kind) values
  ('cccc0001-0000-0000-0000-000000000001', 'bbbb0001-0000-0000-0000-000000000001', 5, 'rotating_pool'),
  ('cccc0001-0000-0000-0000-000000000001', 'bbbb0002-0000-0000-0000-000000000002', 6, 'rotating_pool'),
  ('cccc0001-0000-0000-0000-000000000001', 'bbbb0003-0000-0000-0000-000000000003', 7, 'rotating_pool'),
  ('cccc0001-0000-0000-0000-000000000001', 'bbbb0004-0000-0000-0000-000000000004', 8, 'rotating_pool'),
  ('cccc0001-0000-0000-0000-000000000001', 'bbbb0005-0000-0000-0000-000000000005', 9, 'rotating_pool'),
  ('cccc0001-0000-0000-0000-000000000001', 'bbbb0006-0000-0000-0000-000000000006', 10, 'rotating_pool');

-- ─── Sample Rounds with Demo Data ───────────────────────────────────
-- Round 1 (closed, 6 weeks ago)
insert into rounds (id, team_id, question_set_id, token, status, opens_at, closes_at) values
  ('dddd0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cccc0001-0000-0000-0000-000000000001',
   'demo-round-1', 'closed', now() - interval '42 days', now() - interval '40 days');

insert into round_questions (id, round_id, question_id, kind, position) values
  ('rq010001-0000-0000-0000-000000000001', 'dddd0001-0000-0000-0000-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 'fixed', 1),
  ('rq010002-0000-0000-0000-000000000002', 'dddd0001-0000-0000-0000-000000000001', 'aaaa0002-0000-0000-0000-000000000002', 'fixed', 2),
  ('rq010003-0000-0000-0000-000000000003', 'dddd0001-0000-0000-0000-000000000001', 'aaaa0003-0000-0000-0000-000000000003', 'fixed', 3),
  ('rq010004-0000-0000-0000-000000000004', 'dddd0001-0000-0000-0000-000000000001', 'aaaa0004-0000-0000-0000-000000000004', 'fixed', 4),
  ('rq010005-0000-0000-0000-000000000005', 'dddd0001-0000-0000-0000-000000000001', 'bbbb0001-0000-0000-0000-000000000001', 'rotating', 5);

-- Round 2 (closed, 4 weeks ago)
insert into rounds (id, team_id, question_set_id, token, status, opens_at, closes_at) values
  ('dddd0002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'cccc0001-0000-0000-0000-000000000001',
   'demo-round-2', 'closed', now() - interval '28 days', now() - interval '26 days');

insert into round_questions (id, round_id, question_id, kind, position) values
  ('rq020001-0000-0000-0000-000000000001', 'dddd0002-0000-0000-0000-000000000002', 'aaaa0001-0000-0000-0000-000000000001', 'fixed', 1),
  ('rq020002-0000-0000-0000-000000000002', 'dddd0002-0000-0000-0000-000000000002', 'aaaa0002-0000-0000-0000-000000000002', 'fixed', 2),
  ('rq020003-0000-0000-0000-000000000003', 'dddd0002-0000-0000-0000-000000000002', 'aaaa0003-0000-0000-0000-000000000003', 'fixed', 3),
  ('rq020004-0000-0000-0000-000000000004', 'dddd0002-0000-0000-0000-000000000002', 'aaaa0004-0000-0000-0000-000000000004', 'fixed', 4),
  ('rq020005-0000-0000-0000-000000000005', 'dddd0002-0000-0000-0000-000000000002', 'bbbb0002-0000-0000-0000-000000000002', 'rotating', 5);

-- Round 3 (closed, 2 weeks ago)
insert into rounds (id, team_id, question_set_id, token, status, opens_at, closes_at) values
  ('dddd0003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'cccc0001-0000-0000-0000-000000000001',
   'demo-round-3', 'closed', now() - interval '14 days', now() - interval '12 days');

insert into round_questions (id, round_id, question_id, kind, position) values
  ('rq030001-0000-0000-0000-000000000001', 'dddd0003-0000-0000-0000-000000000003', 'aaaa0001-0000-0000-0000-000000000001', 'fixed', 1),
  ('rq030002-0000-0000-0000-000000000002', 'dddd0003-0000-0000-0000-000000000003', 'aaaa0002-0000-0000-0000-000000000002', 'fixed', 2),
  ('rq030003-0000-0000-0000-000000000003', 'dddd0003-0000-0000-0000-000000000003', 'aaaa0003-0000-0000-0000-000000000003', 'fixed', 3),
  ('rq030004-0000-0000-0000-000000000004', 'dddd0003-0000-0000-0000-000000000003', 'aaaa0004-0000-0000-0000-000000000004', 'fixed', 4),
  ('rq030005-0000-0000-0000-000000000005', 'dddd0003-0000-0000-0000-000000000003', 'bbbb0003-0000-0000-0000-000000000003', 'rotating', 5);

-- Round 4 (open, current)
insert into rounds (id, team_id, question_set_id, token, status, opens_at) values
  ('dddd0004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'cccc0001-0000-0000-0000-000000000001',
   'demo-round-4', 'open', now() - interval '1 day');

insert into round_questions (id, round_id, question_id, kind, position) values
  ('rq040001-0000-0000-0000-000000000001', 'dddd0004-0000-0000-0000-000000000004', 'aaaa0001-0000-0000-0000-000000000001', 'fixed', 1),
  ('rq040002-0000-0000-0000-000000000002', 'dddd0004-0000-0000-0000-000000000004', 'aaaa0002-0000-0000-0000-000000000002', 'fixed', 2),
  ('rq040003-0000-0000-0000-000000000003', 'dddd0004-0000-0000-0000-000000000004', 'aaaa0003-0000-0000-0000-000000000003', 'fixed', 3),
  ('rq040004-0000-0000-0000-000000000004', 'dddd0004-0000-0000-0000-000000000004', 'aaaa0004-0000-0000-0000-000000000004', 'fixed', 4),
  ('rq040005-0000-0000-0000-000000000005', 'dddd0004-0000-0000-0000-000000000004', 'bbbb0004-0000-0000-0000-000000000004', 'rotating', 5);

-- ─── Sample Submissions for Rounds 1-3 ──────────────────────────────
-- Helper: We insert 5 submissions per round with varied answers.
-- Values are 1-3 scale (1=Disagree, 2=Partly, 3=Agree)

-- Round 1 submissions (5 people)
do $$
declare
  sub_id uuid;
  vals int[][] := array[
    array[2,2,3,3,2],  -- person A answers for q1-q5
    array[3,2,2,3,3],  -- person B
    array[2,3,3,2,2],  -- person C
    array[3,3,2,3,3],  -- person D
    array[2,2,2,2,2]   -- person E
  ];
  rq_ids text[] := array[
    'rq010001-0000-0000-0000-000000000001',
    'rq010002-0000-0000-0000-000000000002',
    'rq010003-0000-0000-0000-000000000003',
    'rq010004-0000-0000-0000-000000000004',
    'rq010005-0000-0000-0000-000000000005'
  ];
begin
  for p in 1..5 loop
    sub_id := gen_random_uuid();
    insert into submissions (id, round_id, created_at) values
      (sub_id, 'dddd0001-0000-0000-0000-000000000001', now() - interval '41 days' + (p || ' hours')::interval);
    for q in 1..5 loop
      insert into answers (submission_id, round_question_id, value) values
        (sub_id, rq_ids[q]::uuid, vals[p][q]);
    end loop;
  end loop;
end $$;

-- Round 2 submissions (6 people, slightly lower workload scores)
do $$
declare
  sub_id uuid;
  vals int[][] := array[
    array[1,2,3,3,2],
    array[2,1,2,3,2],
    array[1,2,3,2,3],
    array[2,2,2,3,2],
    array[1,1,3,3,3],
    array[2,2,2,2,2]
  ];
  rq_ids text[] := array[
    'rq020001-0000-0000-0000-000000000001',
    'rq020002-0000-0000-0000-000000000002',
    'rq020003-0000-0000-0000-000000000003',
    'rq020004-0000-0000-0000-000000000004',
    'rq020005-0000-0000-0000-000000000005'
  ];
begin
  for p in 1..6 loop
    sub_id := gen_random_uuid();
    insert into submissions (id, round_id, created_at) values
      (sub_id, 'dddd0002-0000-0000-0000-000000000002', now() - interval '27 days' + (p || ' hours')::interval);
    for q in 1..5 loop
      insert into answers (submission_id, round_question_id, value) values
        (sub_id, rq_ids[q]::uuid, vals[p][q]);
    end loop;
  end loop;
end $$;

-- Round 3 submissions (5 people, workload recovering, clarity dipping)
do $$
declare
  sub_id uuid;
  vals int[][] := array[
    array[2,2,1,2,3],
    array[3,3,2,2,2],
    array[2,2,1,3,3],
    array[2,3,2,2,2],
    array[3,2,1,3,3]
  ];
  rq_ids text[] := array[
    'rq030001-0000-0000-0000-000000000001',
    'rq030002-0000-0000-0000-000000000002',
    'rq030003-0000-0000-0000-000000000003',
    'rq030004-0000-0000-0000-000000000004',
    'rq030005-0000-0000-0000-000000000005'
  ];
begin
  for p in 1..5 loop
    sub_id := gen_random_uuid();
    insert into submissions (id, round_id, created_at) values
      (sub_id, 'dddd0003-0000-0000-0000-000000000003', now() - interval '13 days' + (p || ' hours')::interval);
    for q in 1..5 loop
      insert into answers (submission_id, round_question_id, value) values
        (sub_id, rq_ids[q]::uuid, vals[p][q]);
    end loop;
  end loop;
end $$;

-- Add some free text to round 2 and 3
insert into free_text (submission_id, text)
select s.id, 'Lots of context switching lately.'
from submissions s where s.round_id = 'dddd0002-0000-0000-0000-000000000002'
limit 1;

insert into free_text (submission_id, text)
select s.id, 'Would be great to know the roadmap better.'
from submissions s where s.round_id = 'dddd0003-0000-0000-0000-000000000003'
limit 1;
