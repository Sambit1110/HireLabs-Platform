-- Server-side parsing jobs: explicit states, idempotent claiming, and bucket limits.
--
-- States: queued -> processing -> completed | failed
-- ('uploaded' is the legacy name for 'queued' and is treated identically.)

alter table public.resumes
  add column if not exists processing_job_id uuid,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_attempts integer not null default 0;

alter table public.resumes
  alter column processing_status set default 'queued';

-- NOT VALID: enforce for new writes without failing on unexpected legacy rows.
alter table public.resumes
  drop constraint if exists resumes_processing_status_check;
alter table public.resumes
  add constraint resumes_processing_status_check
  check (processing_status in ('uploaded', 'queued', 'processing', 'completed', 'failed'))
  not valid;

-- Atomically moves one resume into 'processing' for the calling user.
--
-- A single UPDATE ... WHERE is atomic in Postgres, so when two tabs or two
-- requests race for the same resume exactly one gets a row back; the other
-- gets an empty result and must not parse.
--
-- Without p_allow_retry only queued/uploaded rows can be claimed, so failed
-- resumes are never re-processed automatically. With p_allow_retry (an
-- explicit user retry) failed rows and stalled 'processing' rows (older than
-- p_stale_after, e.g. a crashed function) can be claimed too.
--
-- SECURITY INVOKER + auth.uid(): runs under the caller's RLS policies and can
-- only ever touch the caller's own rows.
create or replace function public.claim_resume_for_parsing(
  p_resume_id uuid,
  p_job_id uuid,
  p_allow_retry boolean default false,
  p_stale_after interval default interval '5 minutes'
)
returns setof public.resumes
language sql
security invoker
set search_path = public
as $$
  update public.resumes
     set processing_status = 'processing',
         processing_job_id = p_job_id,
         processing_started_at = now(),
         processing_attempts = processing_attempts + 1,
         parser_error = null
   where id = p_resume_id
     and user_id = auth.uid()
     and (
       processing_status in ('queued', 'uploaded')
       or (
         p_allow_retry
         and (
           processing_status = 'failed'
           or (
             processing_status = 'processing'
             and (processing_started_at is null or processing_started_at < now() - p_stale_after)
           )
         )
       )
     )
  returning *;
$$;

revoke all on function public.claim_resume_for_parsing(uuid, uuid, boolean, interval) from public, anon;
grant execute on function public.claim_resume_for_parsing(uuid, uuid, boolean, interval) to authenticated;

-- Enforce the upload rules at the storage layer as well as in the app.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array[
         'application/pdf',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
       ]
 where id = 'resumes';
