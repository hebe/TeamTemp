-- Fix demo data: better retro experience for round 3
-- Run this in Supabase SQL Editor

-- 1. Delete old round 3 (cascades to round_questions, submissions, answers, free_text)
delete from rounds where id = 'dddd0003-0000-0000-0000-000000000003';

-- 2. Create new round 3 with a better UUID (gives a fun check-in question)
insert into rounds (id, team_id, question_set_id, token, status, scale_max, opens_at, closes_at) values
  ('dddd0003-0000-0000-0000-000000000030', '11111111-1111-1111-1111-111111111111', 'cccc0001-0000-0000-0000-000000000001',
   'demo-round-3', 'closed', 3, now() - interval '14 days', now() - interval '12 days');

insert into round_questions (id, round_id, question_id, kind, position) values
  ('ee030001-0000-0000-0000-000000000001', 'dddd0003-0000-0000-0000-000000000030', 'aaaa0001-0000-0000-0000-000000000001', 'fixed', 1),
  ('ee030002-0000-0000-0000-000000000002', 'dddd0003-0000-0000-0000-000000000030', 'aaaa0002-0000-0000-0000-000000000002', 'fixed', 2),
  ('ee030003-0000-0000-0000-000000000003', 'dddd0003-0000-0000-0000-000000000030', 'aaaa0003-0000-0000-0000-000000000003', 'fixed', 3),
  ('ee030004-0000-0000-0000-000000000004', 'dddd0003-0000-0000-0000-000000000030', 'aaaa0004-0000-0000-0000-000000000004', 'fixed', 4),
  ('ee030005-0000-0000-0000-000000000005', 'dddd0003-0000-0000-0000-000000000030', 'bbbb0003-0000-0000-0000-000000000003', 'rotating', 5);

-- 3. Insert submissions with tweaked values
-- Focus drops hard (was ~2.0 in R2, now ~1.2), clarity stays low, workload recovers, purpose strong
do $$
declare
  sub_id uuid;
  vals int[][] := array[
    array[2,1,1,3,2],
    array[3,1,2,2,3],
    array[2,1,1,3,2],
    array[3,2,1,3,3],
    array[2,1,2,3,2]
  ];
  rq_ids text[] := array[
    'ee030001-0000-0000-0000-000000000001',
    'ee030002-0000-0000-0000-000000000002',
    'ee030003-0000-0000-0000-000000000003',
    'ee030004-0000-0000-0000-000000000004',
    'ee030005-0000-0000-0000-000000000005'
  ];
begin
  for p in 1..5 loop
    sub_id := gen_random_uuid();
    insert into submissions (id, round_id, created_at) values
      (sub_id, 'dddd0003-0000-0000-0000-000000000030', now() - interval '13 days' + (p || ' hours')::interval);
    for q in 1..5 loop
      insert into answers (submission_id, round_question_id, value) values
        (sub_id, rq_ids[q]::uuid, vals[p][q]);
    end loop;
  end loop;
end $$;

-- 4. Add 3 free text comments to round 3
insert into free_text (submission_id, text)
select s.id, 'Would be great to know the roadmap better.'
from submissions s where s.round_id = 'dddd0003-0000-0000-0000-000000000030'
order by created_at
limit 1;

insert into free_text (submission_id, text)
select s.id, 'Hard to get into the flow with so many interruptions lately.'
from submissions s where s.round_id = 'dddd0003-0000-0000-0000-000000000030'
order by created_at
offset 1 limit 1;

insert into free_text (submission_id, text)
select s.id, 'The new sprint format is actually working really well for me.'
from submissions s where s.round_id = 'dddd0003-0000-0000-0000-000000000030'
order by created_at
offset 2 limit 1;
