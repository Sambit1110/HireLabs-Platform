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
    strengths: list(result.strengths),
    gaps: list(result.gaps),
    riskFlags: list(result.risk_flags),
    interviewQuestions: list(result.interview_questions),
    areasToVerify: list(insights.areas_for_verification),
    overallAssessment: text(insights.overall_assessment),
  };
}
