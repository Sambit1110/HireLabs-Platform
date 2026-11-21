'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { createSingleFlight, runWithConcurrency } from '@/lib/resume/batch';
import { QUEUED_STATUSES } from '@/lib/resume/columns';
import { MAX_BATCH_FILES, validateResumeFile } from '@/lib/resume/validation';
import {
  clearAllResumes,
  listResumes,
  requestParse,
  uploadResume,
  waitForProcessing,
} from '@/lib/resume/service';

/** Files uploaded + parsed at the same time. Others wait in the queue. */
export const RESUME_CONCURRENCY = 3;

const ACTIVE_JOB_STATUSES = new Set(['queued', 'uploading', 'processing']);

// One in-flight parse per resume id for this browser tab. Cross-tab duplicates
// are prevented server-side by the atomic claim in the parse API.
const parseFlight = createSingleFlight();

function newId() {
  return crypto.randomUUID();
}

/**
 * Resume library + batch processing.
 *
 * Each selected file becomes a job with a stable id:
 *   { id, fileName, status: queued|uploading|processing|completed|failed, progress, resumeId, error }
 * Jobs run through a bounded pool (RESUME_CONCURRENCY). Each job's outcome is
 * written to its own entry as soon as it settles, so results appear in
 * completion order and one failure never affects the others.
 */
export function useResumeProcessing({ user, onAuthRequired, onResumeReady }) {
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [notice, setNotice] = useState(null);

  const userId = user?.id ?? null;
  const mountedRef = useRef(true);
  const onResumeReadyRef = useRef(onResumeReady);
  const onAuthRequiredRef = useRef(onAuthRequired);

  // Callbacks from the parent are read through refs so an inline function
  // does not re-trigger the library load effect on every render.
  useEffect(() => {
    onResumeReadyRef.current = onResumeReady;
    onAuthRequiredRef.current = onAuthRequired;
  }, [onResumeReady, onAuthRequired]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const upsertResume = useCallback((row) => {
    if (!row?.id || !mountedRef.current) return;
    setResumes((current) => {
      const index = current.findIndex((item) => item.id === row.id);
      if (index === -1) return [row, ...current];
      const next = current.slice();
      next[index] = { ...current[index], ...row };
      return next;
    });
  }, []);

  const updateJob = useCallback((jobId, patch) => {
    if (!mountedRef.current) return;
    setJobs((current) => current.map((job) => (job.id === jobId ? { ...job, ...patch } : job)));
  }, []);

  /** Parses one stored resume; concurrent calls for the same id share one request. */
  const processResume = useCallback((resumeId, { retry = false } = {}) => parseFlight.run(resumeId, async () => {
    const supabase = createClient();

    setResumes((current) => current.map((item) => (
      item.id === resumeId
        ? { ...item, processing_status: 'processing', processing_started_at: new Date().toISOString(), parser_error: null }
        : item
    )));

    let outcome;
    try {
      outcome = await requestParse(supabase, resumeId, { retry });
    } catch (error) {
      if (error.status === 401) onAuthRequiredRef.current?.();
      outcome = { resume: null, error: error.message || 'Resume parsing failed.', status: error.status ?? 0 };
    }

    // Another tab (or request) owns the job: wait for its result instead of re-parsing.
    if (outcome.status === 409 && outcome.resume?.processing_status === 'processing') {
      upsertResume(outcome.resume);
      const settled = await waitForProcessing(supabase, resumeId, { isCancelled: () => !mountedRef.current });
      if (settled) outcome = { ...outcome, resume: settled, error: settled.processing_status === 'completed' ? null : settled.parser_error };
    }

    if (outcome.resume) {
      upsertResume(outcome.resume);
    } else {
      // No authoritative row (network/auth/rate limit): the server never claimed
      // it, so it is still queued and can be picked up again later.
      setResumes((current) => current.map((item) => (
        item.id === resumeId && item.processing_status === 'processing'
          ? { ...item, processing_status: 'queued', parser_error: outcome.error }
          : item
      )));
    }

    return outcome;
  }), [upsertResume]);

  // Load the library for the signed-in user; auto-process only *queued* rows.
  // Failed rows wait for an explicit retry, so broken files are never retried
  // on every page load.
  useEffect(() => {
    if (!userId) {
      queueMicrotask(() => {
        if (mountedRef.current) setResumes([]);
      });
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      let rows;
      try {
        rows = await listResumes(createClient(), userId);
      } catch (error) {
        console.error('Unable to load resumes:', error);
        if (!cancelled) setNotice({ tone: 'error', text: error.message });
        return;
      } finally {
        if (!cancelled) setIsLoading(false);
      }
      if (cancelled) return;
      setResumes(rows);

      // Each row's result is applied independently as it settles.
      const queued = rows.filter((row) => QUEUED_STATUSES.has(row.processing_status));
      if (queued.length) {
        await runWithConcurrency(queued, (row) => processResume(row.id), { concurrency: RESUME_CONCURRENCY });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, processResume]);

  const uploadFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList ?? []).filter(Boolean);
    if (!files.length) return;

    if (!userId) {
      onAuthRequiredRef.current?.();
      setNotice({ tone: 'error', text: 'Sign in to upload and save resumes.' });
      return;
    }

    const accepted = files.slice(0, MAX_BATCH_FILES);
    const batch = accepted.map((file) => {
      const invalid = validateResumeFile(file);
      return {
        id: newId(),
        file,
        fileName: file.name,
        fileSize: file.size,
        status: invalid ? 'failed' : 'queued',
        progress: invalid ? 100 : 0,
        resumeId: null,
        error: invalid,
      };
    });

    // Keep jobs from an earlier batch that are still running.
    setJobs((current) => [
      ...current.filter((job) => ACTIVE_JOB_STATUSES.has(job.status)),
      ...batch.map(({ file: _file, ...job }) => job),
    ]);
    setNotice({
      tone: 'neutral',
      text: files.length > MAX_BATCH_FILES
        ? `Processing the first ${MAX_BATCH_FILES} of ${files.length} files (batch limit).`
        : `Processing ${accepted.length} resume${accepted.length === 1 ? '' : 's'} (${RESUME_CONCURRENCY} at a time)…`,
    });

    const runnable = batch.filter((job) => job.status === 'queued');
    const supabase = createClient();
    let announcedReady = false;

    const outcomes = await runWithConcurrency(runnable, async (job) => {
      updateJob(job.id, { status: 'uploading', progress: 20 });
      const row = await uploadResume(supabase, userId, job.file);
      upsertResume(row);

      updateJob(job.id, { status: 'processing', progress: 60, resumeId: row.id });
      const { resume, error } = await processResume(row.id);

      if (resume?.processing_status !== 'completed') {
        throw new Error(error || resume?.parser_error || 'Resume parsing failed.');
      }
      return resume;
    }, {
      concurrency: RESUME_CONCURRENCY,
      onSettled: (outcome, job) => {
        if (outcome.status === 'fulfilled') {
          updateJob(job.id, { status: 'completed', progress: 100, error: null });
          if (!announcedReady) {
            announcedReady = true;
            onResumeReadyRef.current?.(outcome.value);
          }
        } else {
          updateJob(job.id, {
            status: 'failed',
            progress: 100,
            error: outcome.reason?.message || 'Processing failed.',
          });
        }
      },
    });

    if (!mountedRef.current) return;

    const completed = outcomes.filter((outcome) => outcome?.status === 'fulfilled').length;
    const failed = batch.length - completed;
    setNotice({
      tone: failed ? (completed ? 'neutral' : 'error') : 'success',
      text: failed
        ? `${completed} of ${batch.length} resumes processed · ${failed} failed. See each file below.`
        : `${completed} resume${completed === 1 ? '' : 's'} uploaded and parsed.`,
    });
  }, [userId, processResume, updateJob, upsertResume]);

  const retryResume = useCallback(async (resumeId) => {
    const { resume, error } = await processResume(resumeId, { retry: true });
    if (!mountedRef.current) return;

    const name = resume?.file_name ?? 'The resume';
    setNotice(resume?.processing_status === 'completed'
      ? { tone: 'success', text: `${name} was parsed successfully.` }
      : { tone: 'error', text: `${name} could not be parsed. ${error ?? ''}`.trim() });
  }, [processResume]);

  const isProcessing = jobs.some((job) => ACTIVE_JOB_STATUSES.has(job.status)) ||
    resumes.some((row) => parseFlight.has(row.id));

  const clearAll = useCallback(async () => {
    if (!userId) {
      onAuthRequiredRef.current?.();
      return;
    }

    setIsClearing(true);
    setNotice({ tone: 'neutral', text: 'Clearing your uploaded resumes…' });

    try {
      const { deletedIds, failed } = await clearAllResumes(createClient(), userId);
      if (!mountedRef.current) return;

      const deleted = new Set(deletedIds);
      setResumes((current) => current.filter((row) => !deleted.has(row.id)));
      setJobs([]);
      setNotice(failed.length
        ? {
          tone: 'error',
          text: `Removed ${deletedIds.length} resume${deletedIds.length === 1 ? '' : 's'}; ${failed.length} could not be removed (${failed.slice(0, 3).map((row) => row.file_name).join(', ')}${failed.length > 3 ? '…' : ''}). Try again.`,
        }
        : { tone: 'success', text: `Cleared ${deletedIds.length} uploaded resume${deletedIds.length === 1 ? '' : 's'}.` });
    } catch (error) {
      console.error('Unable to clear resumes:', error);
      if (mountedRef.current) setNotice({ tone: 'error', text: error.message || 'Unable to clear uploaded resumes.' });
    } finally {
      if (mountedRef.current) setIsClearing(false);
    }
  }, [userId]);

  const dismissJobs = useCallback(() => {
    setJobs((current) => current.filter((job) => ACTIVE_JOB_STATUSES.has(job.status)));
  }, []);

  const jobSummary = useMemo(() => ({
    total: jobs.length,
    active: jobs.filter((job) => ACTIVE_JOB_STATUSES.has(job.status)).length,
    completed: jobs.filter((job) => job.status === 'completed').length,
    failed: jobs.filter((job) => job.status === 'failed').length,
  }), [jobs]);

  return {
    resumes,
    jobs,
    jobSummary,
    notice,
    setNotice,
    isLoading,
    isClearing,
    isProcessing,
    uploadFiles,
    retryResume,
    clearAll,
    dismissJobs,
  };
}
