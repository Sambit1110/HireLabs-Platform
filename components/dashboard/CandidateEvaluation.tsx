import { normalizeEvaluation } from "@/lib/ai/evaluation";

function SkillChips({
  items,
  tone,
  empty,
}: {
  items: string[];
  tone: "match" | "partial" | "missing" | "neutral";
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="eval-empty">{empty}</p>;
  }

  return (
    <ul className="eval-chips">
      {items.map((item) => (
        <li key={item} className={`eval-chip eval-chip--${tone}`}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="eval-empty">{empty}</p>;
  }

  return (
    <ul className="eval-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  demonstrated: { label: "Shown in work", tone: "match" },
  partial: { label: "Related only", tone: "partial" },
  unverified: { label: "Listed only", tone: "partial" },
  missing: { label: "Missing", tone: "missing" },
};

const BREAKDOWN_PARTS: { key: "skillCoverage" | "matcherSimilarity" | "llmFit"; label: string; weight: number }[] = [
  { key: "skillCoverage", label: "Skill coverage", weight: 55 },
  { key: "matcherSimilarity", label: "Text similarity (hirelabs-matcher)", weight: 30 },
  { key: "llmFit", label: "Fit (hirelabs-llm)", weight: 15 },
];

/** How hirelabs-explainer built the score: each signal, its value and its weight. */
function ScoreBreakdown({ breakdown }: { breakdown: NonNullable<ReturnType<typeof normalizeEvaluation>["breakdown"]> }) {
  return (
    <section className="eval-panel" aria-labelledby="eval-breakdown">
      <h3 id="eval-breakdown">How the score was built</h3>
      <ul className="eval-breakdown">
        {BREAKDOWN_PARTS.map(({ key, label, weight }) => {
          const value = breakdown[key];
          return (
            <li key={key}>
              <span>
                {label} <span className="eval-muted">· weight {weight}%</span>
              </span>
              <strong>{value === null ? "not available" : `${value}%`}</strong>
              <span className="eval-breakdown__bar" role="img" aria-label={value === null ? `${label} not available` : `${label} ${value}%`}>
                <span style={{ width: `${value ?? 0}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
      <p className="eval-muted">
        Signals that are not available are left out and the other weights are scaled up.
      </p>
    </section>
  );
}

/** Every skill the job asks for, with its status and the resume line behind it. */
function SkillMatrix({ rows, assumedRole }: { rows: ReturnType<typeof normalizeEvaluation>["skillMatrix"]; assumedRole: string }) {
  return (
    <section className="eval-panel" aria-labelledby="eval-matrix">
      <h3 id="eval-matrix">Skill by skill</h3>
      {assumedRole && (
        <p className="eval-muted">
          The job description names few skills, so typical {assumedRole} skills are marked “assumed”.
        </p>
      )}
      <div className="eval-matrix-wrap">
        <table className="eval-matrix">
          <thead>
            <tr>
              <th scope="col">Skill</th>
              <th scope="col">Status</th>
              <th scope="col">Evidence in the resume</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = STATUS_LABELS[row.status];
              return (
                <tr key={row.skill}>
                  <th scope="row">
                    {row.skill}
                    <span className="eval-muted eval-matrix__kind">
                      {row.kind}{row.assumed ? ", assumed" : ""}
                    </span>
                  </th>
                  <td>
                    <span className={`eval-chip eval-chip--${status.tone}`}>{status.label}</span>
                  </td>
                  <td className="eval-matrix__quote">
                    {row.quote ? `“${row.quote}”` : <span className="eval-empty">No line to quote</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Explains a candidate evaluation: score and verdict, matched vs missing
 * skills, and the resume evidence behind them.
 */
export default function CandidateEvaluation({ data }: { data: unknown }) {
  const evaluation = normalizeEvaluation(data);
  const verdictClass = evaluation.verdict || "none";

  return (
    <div className="eval">
      <div className="eval-summary">
        <div className={`eval-score eval-score--${verdictClass}`}>
          {evaluation.fitScore !== null ? (
            <>
              <strong>{evaluation.fitScore}</strong>
              <span>/ 100 fit score</span>
            </>
          ) : (
            <>
              <strong className="eval-score__na">—</strong>
              <span>
                {evaluation.verdict === "insufficient_evidence"
                  ? "Not scored: the resume lacks enough evidence"
                  : "No fit score returned"}
              </span>
            </>
          )}
        </div>

        <div className="eval-verdict">
          <p className={`eval-verdict__label eval-verdict__label--${verdictClass}`}>
            {evaluation.verdictLabel}
          </p>

          {evaluation.confidence !== null && (
            <p className="eval-muted">
              Model confidence: {evaluation.confidence}%
            </p>
          )}

          {evaluation.summary && <p>{evaluation.summary}</p>}
        </div>
      </div>

      {evaluation.breakdown && <ScoreBreakdown breakdown={evaluation.breakdown} />}

      {evaluation.skillMatrix.length > 0 ? (
        <SkillMatrix rows={evaluation.skillMatrix} assumedRole={evaluation.assumedRole} />
      ) : (
      <div className="eval-grid">
        <section className="eval-panel" aria-labelledby="eval-matched">
          <h3 id="eval-matched">Matched skills</h3>
          <SkillChips
            items={evaluation.matchedSkills}
            tone="match"
            empty="No required skills were clearly demonstrated."
          />

          {evaluation.partialSkills.length > 0 && (
            <>
              <h4>Partly shown</h4>
              <SkillChips items={evaluation.partialSkills} tone="partial" empty="" />
            </>
          )}
        </section>

        <section className="eval-panel" aria-labelledby="eval-missing">
          <h3 id="eval-missing">Missing skills</h3>
          <h4>Required</h4>
          <SkillChips
            items={evaluation.missingRequired}
            tone="missing"
            empty="No required skills are missing."
          />

          {evaluation.missingPreferred.length > 0 && (
            <>
              <h4>Preferred</h4>
              <SkillChips items={evaluation.missingPreferred} tone="neutral" empty="" />
            </>
          )}

          {evaluation.unverifiedSkills.length > 0 && (
            <>
              <h4>Claimed but not backed by evidence</h4>
              <SkillChips items={evaluation.unverifiedSkills} tone="partial" empty="" />
            </>
          )}
        </section>
      </div>
      )}

      {evaluation.skillGapSummary && (
        <p className="eval-muted">{evaluation.skillGapSummary}</p>
      )}

      {/* The skill table already shows each quote next to its skill. */}
      {evaluation.skillMatrix.length === 0 && (
      <section className="eval-panel" aria-labelledby="eval-evidence">
        <h3 id="eval-evidence">Evidence from the resume</h3>
        {evaluation.evidence.length > 0 ? (
          <ul className="eval-quotes">
            {evaluation.evidence.map((item) => (
              <li key={item}>
                <blockquote>{item}</blockquote>
              </li>
            ))}
          </ul>
        ) : (
          <p className="eval-empty">
            {evaluation.evidenceRemoved > 0
              ? "No quote the model gave could be found in the resume."
              : "The model did not cite resume evidence."}
          </p>
        )}
        {evaluation.evidenceRemoved > 0 && evaluation.evidence.length > 0 && (
          <p className="eval-muted">
            {evaluation.evidenceRemoved === 1
              ? "1 quote was left out because it is not in the resume."
              : `${evaluation.evidenceRemoved} quotes were left out because they are not in the resume.`}
          </p>
        )}
      </section>
      )}

      <div className="eval-grid">
        <section className="eval-panel" aria-labelledby="eval-strengths">
          <h3 id="eval-strengths">Strengths</h3>
          <BulletList items={evaluation.strengths} empty="None listed." />
        </section>

        <section className="eval-panel" aria-labelledby="eval-gaps">
          <h3 id="eval-gaps">Gaps</h3>
          <BulletList items={evaluation.gaps} empty="None listed." />
        </section>
      </div>

      <div className="eval-grid">
        <section className="eval-panel" aria-labelledby="eval-risks">
          <h3 id="eval-risks">Risk flags and things to verify</h3>
          <BulletList
            items={[...evaluation.riskFlags, ...evaluation.areasToVerify]}
            empty="No risk flags raised."
          />
        </section>

        <section className="eval-panel" aria-labelledby="eval-questions">
          <h3 id="eval-questions">Suggested interview questions</h3>
          <BulletList items={evaluation.interviewQuestions} empty="None suggested." />
        </section>
      </div>

      {(evaluation.recommendation || evaluation.overallAssessment) && (
        <section className="eval-panel" aria-labelledby="eval-recommendation">
          <h3 id="eval-recommendation">Recommendation</h3>
          {evaluation.recommendation && <p>{evaluation.recommendation}</p>}
          {evaluation.overallAssessment && (
            <p className="eval-muted">{evaluation.overallAssessment}</p>
          )}
        </section>
      )}
    </div>
  );
}
