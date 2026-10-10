-- RolePath AI database schema
-- Run in Supabase Dashboard → SQL Editor → New query.

create extension if not exists pgcrypto;

create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_role text not null,
  background text not null default '',
  estimated_weeks integer not null check (estimated_weeks between 1 and 52),
  curriculum jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists learning_paths_user_created_idx
  on public.learning_paths (user_id, created_at desc);

create table if not exists public.module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  module_id text not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, path_id, module_id)
);

create index if not exists module_progress_user_path_idx
  on public.module_progress (user_id, path_id);

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_role text not null,
  question text not null,
  answer text not null,
  score numeric(3,1) not null check (score between 1 and 10),
  evaluation jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists interview_sessions_user_created_idx
  on public.interview_sessions (user_id, created_at desc);

alter table public.learning_paths enable row level security;
alter table public.module_progress enable row level security;
alter table public.interview_sessions enable row level security;

drop policy if exists "Users manage their own learning paths" on public.learning_paths;
create policy "Users manage their own learning paths"
  on public.learning_paths for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own module progress" on public.module_progress;
create policy "Users manage their own module progress"
  on public.module_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own interview sessions" on public.interview_sessions;
create policy "Users manage their own interview sessions"
  on public.interview_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.learning_paths to authenticated;
grant select, insert, update, delete on public.module_progress to authenticated;
grant select, insert, update, delete on public.interview_sessions to authenticated;
