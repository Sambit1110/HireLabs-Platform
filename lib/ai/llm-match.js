import { callModelServer, useLocalModels } from './model-server';

/**
 * Second opinion from hirelabs-llm, the team's from-scratch language model, through the
 * model server's POST /match (see docs/hirelabs-llm.md). Matching never depends on it: on
 * any failure the remaining resumes are skipped and simply get no LLM score.
 */

export const LLM_MODEL = 'hirelabs-llm';
export const MAX_LLM_SCORED = 20;
const MAX_TEXT = 20000;
const CONCURRENCY = 4;
const VERDICTS = new Set(['strong', 'moderate', 'weak']);

/** The /match reply as { score, verdict, missing_skills }, or null if it is malformed. */
export function parseLlmFit(value) {
  if (!value || typeof value !== 'object') return null;
  const { score, verdict, missingSkills } = value;
  if (!Number.isInteger(score) || score < 0 || score > 100 || !VERDICTS.has(verdict)) return null;
  const missing = Array.isArray(missingSkills)
    ? missingSkills.filter((skill) => typeof skill === 'string' && skill.trim()).slice(0, 20)
    : [];
  return { score, verdict, missing_skills: missing };
}

/**
 * Scores up to MAX_LLM_SCORED resumes ([{ id, text }], in rank order) against the job.
 * Returns { results: Map(id -> fit), placeholder }. Never throws.
 */
export async function scoreWithLlm(jobText, resumes) {
  const results = new Map();
  let placeholder = false;
  if (!useLocalModels() || typeof jobText !== 'string' || !jobText.trim()) return { results, placeholder };

  const queue = resumes
    .filter((resume) => typeof resume?.text === 'string' && resume.text.trim())
    .slice(0, MAX_LLM_SCORED);
  const job = jobText.slice(0, MAX_TEXT);
  let next = 0;
  let stopped = false;

  const worker = async () => {
    while (!stopped && next < queue.length) {
      const resume = queue[next];
      next += 1;
      try {
        const reply = await callModelServer('/match', { job, resume: resume.text.slice(0, MAX_TEXT) });
        const fit = parseLlmFit(reply.value);
        if (!fit) throw new Error('Malformed hirelabs-llm reply.');
        if (reply.placeholder) placeholder = true;
        results.set(resume.id, fit);
      } catch {
        // Model missing, server down or timed out: don't make the user wait for the rest.
        stopped = true;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  return { results, placeholder };
}
