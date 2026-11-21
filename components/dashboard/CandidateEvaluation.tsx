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

      {evaluation.skillGapSummary && (
        <p className="eval-muted">{evaluation.skillGapSummary}</p>
      )}

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
          <p className="eval-empty">The model did not cite resume evidence.</p>
        )}
      </section>

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
