-- Enable Row Level Security on all public tables.
-- All database access is performed server-side via the service role key,
-- which bypasses RLS. Enabling RLS with no permissive policies means the
-- anon role (used by PostgREST's public API) is denied access to everything.
--
-- Run this in the Supabase SQL Editor.

alter table public.teams enable row level security;
alter table public.team_settings enable row level security;
alter table public.question_bank enable row level security;
alter table public.question_set enable row level security;
alter table public.question_set_item enable row level security;
alter table public.rounds enable row level security;
alter table public.round_questions enable row level security;
alter table public.submissions enable row level security;
alter table public.answers enable row level security;
alter table public.free_text enable row level security;
alter table public.round_insights enable row level security;
