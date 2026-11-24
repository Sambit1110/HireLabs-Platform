-- Recruiter feedback on candidate evaluations: each row is a human judgement of one
-- (resume, job) evaluation. Exported as human labels (scripts/evaluator/export_feedback.mjs)
-- and summarised on the Model results page.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

create table if not exists public.evaluation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  job_description text not null check (char_length(job_description) between 1 and 12000),
  job_hash text not null check (job_hash ~ '^[0-9a-f]{64}$'),
  model_used text not null check (char_length(model_used) <= 100),
  model_score integer check (model_score between 0 and 100),
  model_verdict text check (model_verdict in ('strong', 'moderate', 'weak', 'insufficient_evidence')),
  agrees boolean,
  human_score integer check (human_score between 0 and 100),
  human_verdict text check (human_verdict in ('strong', 'moderate', 'weak')),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One judgement per recruiter, resume and job; giving feedback again updates it.
  unique (user_id, resume_id, job_hash)
);

alter table public.evaluation_feedback enable row level security;

drop policy if exists "Users can view their own feedback" on public.evaluation_feedback;
create policy "Users can view their own feedback"
  on public.evaluation_feedback for select using (auth.uid() = user_id);

drop policy if exists "Users can add their own feedback" on public.evaluation_feedback;
create policy "Users can add their own feedback"
  on public.evaluation_feedback for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own feedback" on public.evaluation_feedback;
create policy "Users can update their own feedback"
  on public.evaluation_feedback for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own feedback" on public.evaluation_feedback;
create policy "Users can delete their own feedback"
  on public.evaluation_feedback for delete using (auth.uid() = user_id);

create index if not exists evaluation_feedback_user_created_idx
  on public.evaluation_feedback (user_id, created_at desc);
