-- Shared (cross-instance) AI quota and a schema status probe for /api/health.

-- ---------------------------------------------------------------------------
-- Quota limits: editable only by the project owner (SQL editor / service role).
-- ---------------------------------------------------------------------------
create table if not exists public.api_quota_limits (
  scope text primary key,
  user_daily_limit integer not null check (user_daily_limit > 0),
  global_daily_limit integer not null check (global_daily_limit > 0)
);

insert into public.api_quota_limits (scope, user_daily_limit, global_daily_limit)
values ('ai', 50, 1000)
on conflict (scope) do nothing;

-- One counter per scope / subject (user id or 'global') / UTC day.
create table if not exists public.api_usage_counters (
  scope text not null,
  subject text not null,
  window_day date not null,
  request_count integer not null default 0,
  primary key (scope, subject, window_day)
);

-- RLS on with no policies + no grants: clients cannot read or write these tables.
alter table public.api_quota_limits enable row level security;
alter table public.api_usage_counters enable row level security;
revoke all on public.api_quota_limits from anon, authenticated;
revoke all on public.api_usage_counters from anon, authenticated;

-- Atomically records one request for the calling user and reports whether it
-- is within the per-user and global daily limits. Limits come from
-- api_quota_limits, never from the caller, so calling this RPC directly cannot
-- raise anyone's quota; it can only spend the caller's own allowance.
-- A user who is already over their own limit does not consume global quota.
create or replace function public.consume_api_quota(p_scope text)
returns table (allowed boolean, user_count integer, global_count integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'utc')::date;
  v_limits public.api_quota_limits%rowtype;
  v_user_count integer;
  v_global_count integer;
  v_retry integer := greatest(1, ceil(extract(epoch from ((v_day + 1)::timestamp - (now() at time zone 'utc'))))::integer);
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_limits from public.api_quota_limits where scope = p_scope;
  if not found then
    raise exception 'unknown quota scope' using errcode = '22023';
  end if;

  insert into public.api_usage_counters as c (scope, subject, window_day, request_count)
  values (p_scope, v_user::text, v_day, 1)
  on conflict (scope, subject, window_day)
  do update set request_count = c.request_count + 1
  returning c.request_count into v_user_count;

  if v_user_count > v_limits.user_daily_limit then
    select coalesce(max(request_count), 0) into v_global_count
      from public.api_usage_counters
     where scope = p_scope and subject = 'global' and window_day = v_day;
    return query select false, v_user_count, v_global_count, v_retry;
    return;
  end if;

  insert into public.api_usage_counters as c (scope, subject, window_day, request_count)
  values (p_scope, 'global', v_day, 1)
  on conflict (scope, subject, window_day)
  do update set request_count = c.request_count + 1
  returning c.request_count into v_global_count;

  return query select v_global_count <= v_limits.global_daily_limit, v_user_count, v_global_count, v_retry;
end;
$$;

revoke all on function public.consume_api_quota(text) from public, anon;
grant execute on function public.consume_api_quota(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Schema probe: booleans only, safe to expose to /api/health (anon).
-- ---------------------------------------------------------------------------
create or replace function public.hirelabs_schema_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'version', 4,
    'resumes_table', to_regclass('public.resumes') is not null,
    'job_columns', (
      select count(*) = 3 from information_schema.columns
       where table_schema = 'public' and table_name = 'resumes'
         and column_name in ('processing_job_id', 'processing_started_at', 'processing_attempts')
    ),
    'claim_function', to_regprocedure('public.claim_resume_for_parsing(uuid, uuid, boolean, interval)') is not null,
    'status_constraint', exists (
      select 1 from pg_constraint where conname = 'resumes_processing_status_check'
    ),
    'resumes_rls', coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.resumes')), false),
    'quota_function', to_regprocedure('public.consume_api_quota(text)') is not null
  );
$$;

revoke all on function public.hirelabs_schema_status() from public;
grant execute on function public.hirelabs_schema_status() to anon, authenticated;
