/**
 * Normalize a candidate-evaluation result (the JSON returned by
 * /api/ai-analyze in candidate mode) into a shape the dashboard can render.
 *
 * Honesty rules:
 * - A fit score is only shown when the model actually returned one (0–100).
 * - When the verdict is "insufficient_evidence", no score is shown at all,
 *   even if the model returned a number.
 * - Missing fields become empty lists, never invented values.
 */

export const VERDICT_LABELS = {
  strong: 'Strong fit',
  moderate: 'Moderate fit',
  weak: 'Weak fit',
  insufficient_evidence: 'Insufficient evidence',
};

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function list(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const items = [];

  for (const item of value) {
    const cleaned = text(item);
    const key = cleaned.toLocaleLowerCase();

    if (cleaned && !seen.has(key)) {
      seen.add(key);
      items.push(cleaned);
    }
  }

  return items;
}

function percent(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
    ? Math.round(value)
    : null;
}

const STATUSES = new Set(['demonstrated', 'partial', 'unverified', 'missing']);

/** hirelabs-explainer's score parts (0–100 each, or null), or null for other evaluators. */
function breakdownOf(value) {
  if (!isRecord(value)) return null;
  const parts = {
    skillCoverage: percent(value.skill_coverage),
    matcherSimilarity: percent(value.matcher_similarity),
    // What the similarity counted for in the score (70% or more = full marks).
    matcherPoints: percent(value.matcher_points),
    llmFit: percent(value.llm_fit),
  };
  return [parts.skillCoverage, parts.matcherSimilarity, parts.llmFit].some((part) => part !== null) ? parts : null;
}

/** hirelabs-explainer's skill-by-skill rows; [] for other evaluators. */
function matrixOf(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row) => isRecord(row) && text(row.skill) && STATUSES.has(row.status))
    .slice(0, 40)
    .map((row) => ({
      skill: text(row.skill),
      kind: row.kind === 'preferred' ? 'preferred' : 'required',
      status: row.status,
      quote: text(row.quote),
      assumed: row.assumed === true,
    }));
}

/**
 * @param {unknown} value
 */
export function normalizeEvaluation(value) {
  const result = isRecord(value) ? value : {};
  const gap = isRecord(result.skill_gap_analysis) ? result.skill_gap_analysis : {};
  const insights = isRecord(result.recruiter_insights) ? result.recruiter_insights : {};

  const verdict = Object.prototype.hasOwnProperty.call(VERDICT_LABELS, result.fit_verdict)
    ? /** @type {keyof typeof VERDICT_LABELS} */ (result.fit_verdict)
    : null;

  const fitScore = verdict === 'insufficient_evidence' ? null : percent(result.fit_score);

  return {
    verdict,
    verdictLabel: verdict ? VERDICT_LABELS[verdict] : 'No verdict returned',
    fitScore,
    confidence: percent(result.confidence),
    summary: text(result.candidate_summary),
    experienceSummary: text(result.relevant_experience_summary),
    recommendation: text(result.recommendation),
    matchedSkills: list(gap.demonstrated_skills),
    partialSkills: list(gap.partially_demonstrated_skills),
    missingRequired: list(gap.missing_required_skills),
    missingPreferred: list(gap.missing_preferred_skills),
    unverifiedSkills: list(gap.unverified_skills),
    skillGapSummary: text(gap.skill_gap_summary),
    evidence: list(result.evidence_signals),
    // Quotes the server removed because they were not in the resume text.
    evidenceRemoved:
      Number.isInteger(result.evidence_removed) && result.evidence_removed > 0 ? result.evidence_removed : 0,
    strengths: list(result.strengths),
    gaps: list(result.gaps),
    riskFlags: list(result.risk_flags),
    interviewQuestions: list(result.interview_questions),
    areasToVerify: list(insights.areas_for_verification),
    overallAssessment: text(insights.overall_assessment),
    breakdown: breakdownOf(result.score_breakdown),
    skillMatrix: matrixOf(result.skill_matrix),
    assumedRole: text(result.assumed_role),
  };
}
