'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { runWithConcurrency } from '@/lib/resume/batch';
import { requestAiAnalysis } from '@/lib/resume/service';

export const AI_CONCURRENCY = 2;

function candidatePayload(candidate) {
  // Uploaded resumes are loaded server-side by id; only sample profiles send their fields.
  if (candidate.source === 'uploaded') return { resumeId: candidate.resumeId };
  return {
    name: candidate.name,
    title: candidate.title,
    skills: Array.isArray(candidate.skills) ? candidate.skills.join(', ') : candidate.skills,
    yearsExperience: candidate.yearsExperience,
  };
}

/**
 * Gemini role brief + per-candidate deep dives.
 * `insights` is keyed by candidate id so concurrent analyses never overwrite
 * each other: { [candidateId]: { status: 'loading'|'completed'|'failed', result, error, candidateName } }.
 */
export function useAiAnalysis({ user, onAuthRequired }) {
  const [roleBrief, setRoleBrief] = useState({ status: 'idle', result: null, error: null });
  const [insights, setInsights] = useState({});
  const [focusedId, setFocusedId] = useState(null);
  const onAuthRequiredRef = useRef(onAuthRequired);

  useEffect(() => {
    onAuthRequiredRef.current = onAuthRequired;
  }, [onAuthRequired]);

  const requireUser = useCallback(() => {
    if (user) return true;
    onAuthRequiredRef.current?.();
    return false;
  }, [user]);

  const analyzeRole = useCallback(async ({ role, jobDescription }) => {
    if (!requireUser() || !role.trim() || !jobDescription.trim()) return;

    setRoleBrief({ status: 'loading', result: null, error: null });
    try {
      const result = await requestAiAnalysis(createClient(), { mode: 'role', role, jobDescription });
      setRoleBrief({ status: 'completed', result, error: null });
    } catch (error) {
      setRoleBrief({ status: 'failed', result: null, error: error.message });
    }
  }, [requireUser]);

  /** Analyzes one or many candidates as independent jobs (AI_CONCURRENCY at a time). */
  const analyzeCandidates = useCallback(async (candidates, { role, jobDescription }) => {
    if (!requireUser() || !role.trim() || !jobDescription.trim()) return;

    const eligible = candidates.filter((candidate) => candidate.profileReady !== false);
    if (!eligible.length) return;

    setFocusedId(eligible[0].id);
    setInsights((current) => {
      const next = { ...current };
      for (const candidate of eligible) {
        next[candidate.id] = { status: 'loading', result: null, error: null, candidateName: candidate.name };
      }
      return next;
    });

    const supabase = createClient();
    await runWithConcurrency(
      eligible,
      (candidate) => requestAiAnalysis(supabase, {
        mode: 'candidate',
        role,
        jobDescription,
        candidate: candidatePayload(candidate),
      }),
      {
        concurrency: AI_CONCURRENCY,
        onSettled: (outcome, candidate) => {
          setInsights((current) => ({
            ...current,
            [candidate.id]: outcome.status === 'fulfilled'
              ? { status: 'completed', result: outcome.value, error: null, candidateName: candidate.name }
              : { status: 'failed', result: null, error: outcome.reason?.message || 'AI analysis failed.', candidateName: candidate.name },
          }));
        },
      }
    );
  }, [requireUser]);

  return { roleBrief, insights, focusedId, setFocusedId, analyzeRole, analyzeCandidates };
}
