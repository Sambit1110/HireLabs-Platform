alter table public.resumes
  add column if not exists parsed_text text,
  add column if not exists extracted_skills text[] default '{}',
  add column if not exists candidate_name text,
  add column if not exists candidate_title text,
  add column if not exists years_experience integer,
  add column if not exists profile_completeness integer default 0,
  add column if not exists parser_error text;

create index if not exists resumes_user_id_created_at_idx
  on public.resumes (user_id, created_at desc);
