-- Semantic matching with pgvector (384-dimensional hirelabs-matcher embeddings).
--
-- Enables pgvector extension, adds embedding column to public.resumes,
-- creates the public.job_descriptions table with user-scoped RLS,
-- builds an HNSW cosine index, and provides the match_resumes RPC.

create extension if not exists vector;

-- 1. Resumes embedding vector column
alter table public.resumes
  add column if not exists embedding vector(384),
  add column if not exists embedded_at timestamptz;

-- HNSW index for fast approximate nearest neighbor cosine similarity search
create index if not exists resumes_embedding_hnsw_idx
  on public.resumes using hnsw (embedding vector_cosine_ops);

-- 2. Job descriptions table
create table if not exists public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  text text not null,
  embedding vector(384),
  created_at timestamptz not null default now()
);

-- RLS policies in the same style as 001_create_resumes.sql
alter table public.job_descriptions enable row level security;

create policy "Users can view their own job descriptions"
  on public.job_descriptions for select using (auth.uid() = user_id);

create policy "Users can add their own job descriptions"
  on public.job_descriptions for insert with check (auth.uid() = user_id);

create policy "Users can update their own job descriptions"
  on public.job_descriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own job descriptions"
  on public.job_descriptions for delete using (auth.uid() = user_id);

create index if not exists job_descriptions_user_id_created_at_idx
  on public.job_descriptions (user_id, created_at desc);

create index if not exists job_descriptions_embedding_hnsw_idx
  on public.job_descriptions using hnsw (embedding vector_cosine_ops);

-- 3. Match resumes RPC: ranks the authenticated user's resumes against a query vector
-- Enforces auth.uid() and runs as security invoker so cross-tenant data leaks are impossible.
create or replace function public.match_resumes(query_embedding vector(384), match_count int default 10)
returns table (id uuid, file_name text, similarity float)
language sql stable security invoker
set search_path = public
as $$
  select r.id, r.file_name, 1 - (r.embedding <=> query_embedding) as similarity
  from public.resumes r
  where r.user_id = auth.uid() and r.embedding is not null
  order by r.embedding <=> query_embedding
  limit match_count;
$$;

revoke all on function public.match_resumes(vector, int) from public, anon;
grant execute on function public.match_resumes(vector, int) to authenticated;
