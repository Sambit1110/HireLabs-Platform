/**
 * Recruiter feedback on candidate evaluations: validation for the API, and the agreement
 * summary shown on Model results and written by the export script.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODEL_VERDICTS = new Set(['strong', 'moderate', 'weak', 'insufficient_evidence']);
const MAX_JOB = 12000;
const MAX_NOTE = 1000;

/** The team dataset's verdict bands: strong 75-100, moderate 50-74, weak 0-49. */
export function verdictFor(score) {
  return score >= 75 ? 'strong' : score >= 50 ? 'moderate' : 'weak';
}

const optionalScore = (value) =>
  value === null || value === undefined || value === '' ? null : Number.isInteger(value) && value >= 0 && value <= 100 ? value : NaN;

/**
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function validateFeedback(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Invalid request body.' };
  const { resumeId, jobDescription, modelUsed, modelScore, modelVerdict, agrees, humanScore, note } = body;
  if (typeof resumeId !== 'string' || !UUID.test(resumeId)) return { ok: false, error: 'A valid resumeId is required.' };
  if (typeof jobDescription !== 'string' || !jobDescription.trim() || jobDescription.length > MAX_JOB) {
    return { ok: false, error: 'The job description is required (at most 12,000 characters).' };
  }
  if (typeof modelUsed !== 'string' || !modelUsed.trim() || modelUsed.length > 100) {
    return { ok: false, error: 'modelUsed is required.' };
  }
  const score = optionalScore(modelScore);
  if (Number.isNaN(score)) return { ok: false, error: 'modelScore must be a whole number from 0 to 100.' };
  if (modelVerdict != null && !MODEL_VERDICTS.has(modelVerdict)) return { ok: false, error: 'Invalid modelVerdict.' };
  if (agrees != null && typeof agrees !== 'boolean') return { ok: false, error: 'agrees must be true, false or empty.' };
  const human = optionalScore(humanScore);
  if (Number.isNaN(human)) return { ok: false, error: 'Your score must be a whole number from 0 to 100.' };
  if (note != null && (typeof note !== 'string' || note.length > MAX_NOTE)) return { ok: false, error: 'The note is at most 1,000 characters.' };
  if (agrees == null && human === null) return { ok: false, error: 'Choose Agree or Disagree, or give your own score.' };
  return {
    ok: true,
    value: {
      resume_id: resumeId,
      job_description: jobDescription.trim(),
      model_used: modelUsed.trim(),
      model_score: score,
      model_verdict: modelVerdict ?? null,
      agrees: agrees ?? null,
      human_score: human,
      human_verdict: human === null ? null : verdictFor(human),
      note: typeof note === 'string' && note.trim() ? note.trim() : null,
    },
  };
}

function ranks(values) {
  const order = values.map((value, index) => [value, index]).sort((a, b) => a[0] - b[0]);
  const out = new Array(values.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j += 1;
    for (let k = i; k <= j; k += 1) out[order[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return out;
}

/** Spearman rank correlation, or null with fewer than 3 pairs or no variation. */
export function spearman(xs, ys) {
  if (xs.length < 3 || xs.length !== ys.length) return null;
  const rx = ranks(xs);
  const ry = ranks(ys);
  const mean = (rx.length + 1) / 2;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < rx.length; i += 1) {
    cov += (rx[i] - mean) * (ry[i] - mean);
    vx += (rx[i] - mean) ** 2;
    vy += (ry[i] - mean) ** 2;
  }
  return vx && vy ? cov / Math.sqrt(vx * vy) : null;
}

/**
 * How well the model agrees with recruiters.
 * @param {{ model_score: number|null, model_verdict: string|null, agrees: boolean|null, human_score: number|null, human_verdict: string|null, model_used?: string }[]} rows
 */
export function summarizeFeedback(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const voted = list.filter((row) => typeof row.agrees === 'boolean');
  const scored = list.filter((row) => Number.isInteger(row.human_score) && Number.isInteger(row.model_score));
  const verdicts = list.filter((row) => row.human_verdict && row.model_verdict && row.model_verdict !== 'insufficient_evidence');
  const round = (value, places = 3) => (value === null ? null : Number(value.toFixed(places)));
  return {
    count: list.length,
    votes: voted.length,
    agree_rate: voted.length ? round(voted.filter((row) => row.agrees).length / voted.length) : null,
    scored: scored.length,
    spearman: round(spearman(scored.map((row) => row.model_score), scored.map((row) => row.human_score))),
    mean_abs_error: scored.length
      ? round(scored.reduce((sum, row) => sum + Math.abs(row.model_score - row.human_score), 0) / scored.length, 1)
      : null,
    verdict_agreement: verdicts.length
      ? round(verdicts.filter((row) => row.human_verdict === row.model_verdict).length / verdicts.length)
      : null,
  };
}
