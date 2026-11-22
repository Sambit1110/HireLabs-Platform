-- Allow the 'parsed' status written by the app.
--
-- 003 limited processing_status to uploaded/queued/processing/completed/failed,
-- but app/api/parse-resume marks finished resumes as 'parsed', and the
-- dashboard filters on 'parsed'. Without this, every successful parse is
-- rejected by the check constraint. 'completed' stays allowed for the
-- job-based pipeline described in 003.

alter table public.resumes
  drop constraint if exists resumes_processing_status_check;

alter table public.resumes
  add constraint resumes_processing_status_check
  check (processing_status in ('uploaded', 'queued', 'processing', 'parsed', 'completed', 'failed'))
  not valid;
