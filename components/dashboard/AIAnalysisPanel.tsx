
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { fetchWithNetworkRetry } from "@/lib/api/fetch-retry";
import { describeModel, type ModelInfo } from "@/lib/ai/model-info";
import { SAMPLE_EVALUATION } from "@/lib/fixtures/sample-evaluation";
import { containsEmbeddedResume } from "@/lib/ai/input-validation";
import CandidateEvaluation from "@/components/dashboard/CandidateEvaluation";
import FeedbackBar from "@/components/dashboard/FeedbackBar";
import ModelBadge from "@/components/dashboard/ModelBadge";
import { blindSkills, blindTitle, identityNames, redactDeep } from "@/lib/resume/blind-review";

const SHOW_SAMPLE_PREVIEW = process.env.NODE_ENV !== "production";

type Candidate = {
  id: string;
  candidate_name: string | null;
  candidate_title: string | null;
  extracted_skills: string[] | null;
  parsed_text: string | null;
  years_experience: number | null;
  parser_error?: string | null;
};

type AnalysisMode = "candidate" | "role";

type AnalysisResult = {
  mode: AnalysisMode;
  candidateId: string | null;
  role: string;
  data: unknown;
  generatedAt: string;
  model: ModelInfo;
  sample?: boolean;
};

type ApiResponse = {
  success?: boolean;
  data?: {
    result?: unknown;
    role?: string;
    model?: string;
    model_used?: string;
  };
  error?: {
    message?: string;
  } | string;
};

/**
 * Pre-fill the panel from elsewhere on the dashboard (e.g. "Explain score"
 * in the candidate ranking). Change `key` to apply a new preset.
 */
export type AnalysisPreset = {
  key: number;
  candidateId: string;
  role: string;
  jobDescription: string;
  /** Rank candidates' similarity and LLM score, so Explain score gives the same fit score. */
  signals?: { similarity: number | null; llmScore: number | null } | null;
};

type AIAnalysisPanelProps = {
  candidates: Candidate[];
  preset?: AnalysisPreset | null;
  onReprocess?: (candidateId: string) => void;
  reprocessingId?: string;
  /** Blind review: aliases instead of names, no resume text, no contact details. */
  blind?: boolean;
  aliases?: Map<string, string>;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function formatLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "Not available";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "string") {
    return value.trim() || "Not available";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return JSON.stringify(value);
}

function getErrorMessage(payload: ApiResponse): string {
  if (typeof payload.error === "string") {
    return payload.error;
  }

  if (
    payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return "AI analysis could not be completed.";
}

function candidateLabel(candidate: Candidate, blind: boolean, aliases: Map<string, string>) {
  if (blind) return aliases.get(candidate.id) || "Hidden candidate";
  return (
    candidate.candidate_name?.trim() ||
    candidate.candidate_title?.trim() ||
    `Candidate ${candidate.id.slice(0, 8)}`
  );
}

/** The candidate's title: in blind review only a job title, with any name taken out. */
function candidateTitle(candidate: Candidate, blind: boolean, aliases: Map<string, string>) {
  if (!blind) return candidate.candidate_title?.trim() || "";
  return blindTitle(candidate, candidateLabel(candidate, true, aliases)) || "";
}

const NO_ALIASES = new Map<string, string>();

function hasContent(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isRecord(value)) {
    return Object.keys(value).length > 0;
  }

  return true;
}

function ValueRenderer({
  value,
  depth = 0,
}: {
  value: unknown;
  depth?: number;
}) {
  if (depth > 6) {
    return <p>Additional nested information available in raw JSON.</p>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p>No information available.</p>;
    }

    return (
      <ul className="ai-insight-list">
        {value.map((item, index) => (
          <li key={index}>
            <ValueRenderer
              value={item}
              depth={depth + 1}
            />
          </li>
        ))}
      </ul>
    );
  }

  if (isRecord(value)) {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return <p>No information available.</p>;
    }

    return (
      <div
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        {entries.map(([key, item]) => (
          <div key={key}>
            <strong>{formatLabel(key)}</strong>

            <div style={{ marginTop: 5 }}>
              <ValueRenderer
                value={item}
                depth={depth + 1}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
      {formatValue(value)}
    </p>
  );
}

function InsightCard({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  return (
    <article
      className="dashboard-card ai-insight-card"
      style={{
        minWidth: 0,
        padding: 18,
        border: "1px solid var(--border, #d1d5db)",
        borderRadius: 12,
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>
        {title}
      </h3>

      <ValueRenderer value={value} />
    </article>
  );
}

function ResultDisplay({
  analysis,
  jobDescription,
}: {
  analysis: AnalysisResult;
  jobDescription: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [analysis]);

  const sections = useMemo(() => {
    const result = analysis.data;

    if (isRecord(result)) {
      return Object.entries(result).filter(([, value]) =>
        hasContent(value)
      );
    }

    return [];
  }, [analysis]);

  const copyReport = async () => {
    try {
      const report = JSON.stringify(
        {
          analysisType: analysis.mode,
          role: analysis.role,
          generatedAt: analysis.generatedAt,
          model: analysis.model.id,
          sample: Boolean(analysis.sample),
          result: analysis.data,
        },
        null,
        2
      );

      await navigator.clipboard.writeText(report);

      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      className="ai-analysis-output"
      aria-labelledby="ai-results-heading"
      aria-live="polite"
      style={{ marginTop: 24 }}
    >
      <div className="dashboard-section-heading">
        <div>
          <h2 id="ai-results-heading">
            {analysis.mode === "candidate"
              ? "Candidate evaluation results"
              : "AI role screening brief"}
          </h2>

          <p>
            Role: <strong>{analysis.role}</strong>
          </p>

          <ModelBadge model={analysis.model} />
        </div>

        <button
          type="button"
          className="dashboard-secondary"
          onClick={() => void copyReport()}
        >
          {copied ? "Copied" : "Copy report"}
        </button>
      </div>

      {analysis.sample && (
        <p className="sample-banner" role="note">
          SAMPLE DATA: a fictional result for previewing the layout. Not a
          real evaluation.
        </p>
      )}

      <p className="resume-note">
        Generated on{" "}
        {new Date(
          analysis.generatedAt
        ).toLocaleString()}.
        Generated by HireLabs&apos; own models and rules:
        check it against the resume and the job
        requirements before deciding.
      </p>

      {analysis.mode === "candidate" && isRecord(analysis.data) ? (
        <>
          <CandidateEvaluation data={analysis.data} />
          {!analysis.sample && analysis.candidateId && analysis.model.id && jobDescription.trim() && (
            <FeedbackBar
              resumeId={analysis.candidateId}
              jobDescription={jobDescription.trim()}
              modelUsed={analysis.model.id}
              modelScore={
                Number.isInteger(analysis.data.fit_score) && analysis.data.fit_verdict !== "insufficient_evidence"
                  ? (analysis.data.fit_score as number)
                  : null
              }
              modelVerdict={typeof analysis.data.fit_verdict === "string" ? analysis.data.fit_verdict : null}
            />
          )}
        </>
      ) : sections.length > 0 ? (
        <div
          className="ai-insights-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: 16,
            marginTop: 20,
          }}
        >
          {sections.map(([key, value]) => (
            <InsightCard
              key={key}
              title={formatLabel(key)}
              value={value}
            />
          ))}
        </div>
      ) : (
        <div
          className="dashboard-card"
          style={{ marginTop: 16 }}
        >
          <ValueRenderer value={analysis.data} />
        </div>
      )}

      <details style={{ marginTop: 20 }}>
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          View complete AI response (JSON)
        </summary>

        <pre
          className="ai-analysis-result"
          style={{
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            marginTop: 12,
          }}
        >
          {JSON.stringify(analysis.data, null, 2)}
        </pre>
      </details>
    </section>
  );
}

export default function AIAnalysisPanel({
  candidates,
  preset = null,
  onReprocess,
  reprocessingId = "",
  blind = false,
  aliases = NO_ALIASES,
}: AIAnalysisPanelProps) {
  const [candidateId, setCandidateId] = useState("");
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [result, setResult] =
    useState<AnalysisResult | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Set by "Explain score" in the ranking: evaluate as soon as the fields are filled in.
  const [autoRun, setAutoRun] = useState(false);
  // The ranking's numbers for this candidate and job; dropped once either is changed.
  const [presetSignals, setPresetSignals] = useState<AnalysisPreset["signals"]>(null);

  const controllerRef = useRef<AbortController | null>(
    null
  );

  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!preset) return;

    controllerRef.current?.abort();
    controllerRef.current = null;
    setBusy(false);
    setResult(null);
    setError("");
    setNotice("Explaining this candidate's score…");
    setCandidateId(preset.candidateId);
    setRole(preset.role.trim());
    setJobDescription(preset.jobDescription);
    setPresetSignals(preset.signals ?? null);
    setAutoRun(true);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [preset]);

  const selectedCandidate = useMemo(() => {
    return (
      candidates.find(
        (candidate) => candidate.id === candidateId
      ) || null
    );
  }, [candidates, candidateId]);

  const candidateReady = Boolean(
    selectedCandidate?.parsed_text?.trim()
  );

  // What is shown (and copied): in blind review, the evaluation without the candidate's
  // name or contact details. The stored result keeps the original, so switching back is instant.
  const shownResult = useMemo(() => {
    if (!result || !blind) return result;
    const candidate = candidates.find((item) => item.id === result.candidateId);
    return {
      ...result,
      data: redactDeep(result.data, {
        names: identityNames(candidate),
        alias: candidate ? candidateLabel(candidate, true, aliases) : "The candidate",
      }),
    };
  }, [result, blind, candidates, aliases]);

  const jobDescriptionHasResume = containsEmbeddedResume(jobDescription);
  // The target role is optional: the server reads it from the job description.
  const roleReady = Boolean(
    jobDescription.trim() && !jobDescriptionHasResume
  );
  const disabledReason = !jobDescription.trim()
    ? "Paste a job description to start."
    : jobDescriptionHasResume
      ? ""
      : !candidateReady
        ? "Pick a parsed resume above to evaluate a candidate."
        : "";

  const resetOutput = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;

    setBusy(false);
    setResult(null);
    setError("");
    setNotice("");
    // A changed job, role or candidate no longer matches the ranking's numbers.
    setPresetSignals(null);
  };

  const analyze = async (mode: AnalysisMode) => {
    if (busy || !roleReady) return;

    if (mode === "candidate" && !candidateReady) {
      setError(
        "Select a successfully parsed resume before starting candidate evaluation."
      );
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    setBusy(true);
    setError("");
    setNotice("");
    setResult(null);

    try {
      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error(
          "Your session expired. Please sign in again."
        );
      }

      const requestBody =
        mode === "role"
          ? {
              mode,
              role: role.trim(),
              jobDescription: jobDescription.trim(),
            }
          : {
              mode,
              role: role.trim(),
              jobDescription: jobDescription.trim(),
              candidate: {
                name: selectedCandidate?.candidate_name,
                title: selectedCandidate?.candidate_title,
                skills: (
                  selectedCandidate?.extracted_skills || []
                ).join(" "),
                parsedText:
                  selectedCandidate?.parsed_text || "",
                yearsExperience:
                  selectedCandidate?.years_experience,
              },
              ...(presetSignals ? { signals: presetSignals } : {}),
            };

      // Analysis only reads data, so a dropped connection is retried once.
      const response = await fetchWithNetworkRetry("/api/ai-analyze", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      let payload: ApiResponse;

      try {
        payload = (await response.json()) as ApiResponse;
      } catch {
        throw new Error(
          "The analysis service returned an invalid response."
        );
      }

      if (!response.ok || payload.success !== true) {
        throw new Error(getErrorMessage(payload));
      }

      if (
        !payload.data ||
        !hasContent(payload.data.result)
      ) {
        throw new Error(
          "The AI service returned an empty evaluation."
        );
      }

      if (controller.signal.aborted) return;

      setResult({
        mode,
        // The role the server used: the one typed, or the one read from the job description.
        role: payload.data.role?.trim() || role.trim(),
        candidateId:
          mode === "candidate" ? candidateId : null,
        data: payload.data.result,
        generatedAt: new Date().toISOString(),
        model: describeModel(payload.data),
      });

      setNotice(
        mode === "candidate"
          ? "Candidate evaluation completed."
          : "Role screening brief generated."
      );
    } catch (failure) {
      if (controller.signal.aborted) return;

      setError(
        failure instanceof Error
          ? failure.message
          : "AI analysis could not be completed."
      );
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setBusy(false);
      }
    }
  };

  // Keep a handle on the latest analyze() for the auto-run effect below.
  const analyzeRef = useRef(analyze);
  useEffect(() => {
    analyzeRef.current = analyze;
  });

  useEffect(() => {
    if (!autoRun || busy) return;
    if (!roleReady || !candidateReady) {
      // The candidate has no parsed text (or the job is unusable): leave it to the user.
      if (candidates.length) {
        setAutoRun(false);
        setNotice("Job details and candidate filled in from the ranking.");
      }
      return;
    }
    setAutoRun(false);
    void analyzeRef.current("candidate");
  }, [autoRun, busy, roleReady, candidateReady, candidates.length]);

  const previewSample = () => {
    resetOutput();
    setResult({
      mode: "candidate",
      role: role.trim() || "Backend Engineer (sample)",
      candidateId: null,
      data: SAMPLE_EVALUATION,
      generatedAt: new Date().toISOString(),
      model: describeModel({ model_used: "hirelabs-evaluator" }),
      sample: true,
    });
  };

  const cancelAnalysis = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;

    setBusy(false);
    setNotice("Analysis cancelled.");
  };

  return (
    <section
      ref={sectionRef}
      className="dashboard-card ai-analysis"
      aria-labelledby="ai-analysis-heading"
    >
      <div className="dashboard-section-heading">
        <div>

          <h2 id="ai-analysis-heading">
            Advanced AI analysis
          </h2>

          <p>
            Generate recruiter screening briefs and
            evidence-based candidate evaluations from
            HireLabs&apos; own models. Every quote is checked
            against the resume.
          </p>
        </div>
      </div>

      <div className="ai-analysis-fields">
        <label className="dashboard-label">
          Target role (optional)

          <input
            className="ai-analysis-input"
            type="text"
            value={role}
            maxLength={300}
            disabled={busy}
            onChange={(event) => {
              resetOutput();
              setRole(event.target.value);
            }}
            placeholder="e.g. Software Engineer"
          />
        </label>

        <label className="dashboard-label">
          Job description

          <textarea
            className="ai-analysis-input"
            value={jobDescription}
            maxLength={12000}
            rows={6}
            disabled={busy}
            onChange={(event) => {
              resetOutput();
              setJobDescription(event.target.value);
            }}
            placeholder="Paste responsibilities, required skills, qualifications, and preferred experience."
          />

          <span className="resume-note">
            {jobDescription.length.toLocaleString()}
            /12,000 characters
          </span>
          {jobDescriptionHasResume && (
            <span className="dashboard-alert" role="alert">
              This field contains a RESUME section. Remove the resume text here; the selected candidate&apos;s uploaded resume is included separately.
            </span>
          )}
        </label>

        <label className="dashboard-label">
          Candidate for evaluation

          <select
            className="ai-analysis-input"
            value={candidateId}
            disabled={busy}
            onChange={(event) => {
              resetOutput();
              setCandidateId(event.target.value);
            }}
          >
            <option value="">
              Choose a parsed resume
            </option>

            {candidates.map((candidate) => (
              <option
                key={candidate.id}
                value={candidate.id}
              >
                {candidateLabel(candidate, blind, aliases)}
                {" · "}
                {candidateTitle(candidate, blind, aliases) || "No title"}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedCandidate && (
        <div
          className="dashboard-resume"
          style={{ marginTop: 16 }}
        >
          <div className="resume-main">
            <h3>
              {candidateLabel(selectedCandidate, blind, aliases)}
            </h3>

            <p>
              {candidateTitle(selectedCandidate, blind, aliases) ||
                "Professional title not extracted"}
            </p>

            <p>
              <strong>Experience: </strong>
              {selectedCandidate.years_experience !== null
                ? `${selectedCandidate.years_experience} years`
                : "Not extracted"}
            </p>

            <p className="resume-skills">
              <strong>Extracted skills: </strong>
              {(blind
                ? blindSkills(selectedCandidate.extracted_skills, selectedCandidate)
                : selectedCandidate.extracted_skills || []
              ).join(", ") || "No skills extracted"}
            </p>

            {selectedCandidate.parser_error && (
              <>
                <p className="resume-note">
                  Structured profile fields were not fully extracted. Candidate evaluation uses the resume text below.
                </p>
                {selectedCandidate.parsed_text?.trim() && onReprocess && (
                  <button
                    type="button"
                    className="dashboard-secondary"
                    disabled={Boolean(reprocessingId)}
                    onClick={() => onReprocess(selectedCandidate.id)}
                  >
                    {reprocessingId === selectedCandidate.id
                      ? "Re-extracting…"
                      : "Re-extract profile"}
                  </button>
                )}
              </>
            )}

            {!candidateReady && (
              <p className="resume-note">
                Candidate evaluation requires parsed
                resume text.
              </p>
            )}

            {candidateReady && blind && (
              <p className="resume-note">
                The resume text is hidden in blind review. The evaluation still reads all of it.
              </p>
            )}

            {candidateReady && !blind && (
              <details className="candidate-resume-text">
                <summary>
                  View extracted resume text ({selectedCandidate.parsed_text?.length.toLocaleString()} characters)
                </summary>
                <pre>{selectedCandidate.parsed_text}</pre>
              </details>
            )}
          </div>
        </div>
      )}

      <div
        className="ai-analysis-actions"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 20,
        }}
      >
        <button
          type="button"
          className="dashboard-secondary"
          disabled={busy || !roleReady}
          onClick={() => void analyze("role")}
        >
          {busy
            ? "Analyzing…"
            : "Generate role brief"}
        </button>

        <button
          type="button"
          className="dashboard-secondary"
          disabled={
            busy || !roleReady || !candidateReady
          }
          onClick={() => void analyze("candidate")}
        >
          {busy
            ? "Analyzing…"
            : "Evaluate candidate"}
        </button>

        {busy && (
          <button
            type="button"
            className="dashboard-secondary"
            onClick={cancelAnalysis}
          >
            Cancel
          </button>
        )}

        {SHOW_SAMPLE_PREVIEW && !busy && (
          <button
            type="button"
            className="dashboard-secondary"
            onClick={previewSample}
            title="Development only: shows fictional data"
          >
            Preview sample result
          </button>
        )}

        {result && !busy && (
          <button
            type="button"
            className="dashboard-secondary"
            onClick={resetOutput}
          >
            Clear results
          </button>
        )}
      </div>

      {!busy && disabledReason && (
        <p className="eval-muted" style={{ marginTop: 12 }}>
          {disabledReason}
        </p>
      )}

      {busy && (
        <p role="status" style={{ marginTop: 16 }}>
          Generating recruitment analysis…
        </p>
      )}

      {error && (
        <p className="dashboard-alert" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" style={{ marginTop: 12 }}>
          {notice}
        </p>
      )}

      {shownResult && (
        <ResultDisplay
          key={`${shownResult.mode}-${shownResult.generatedAt}`}
          analysis={shownResult}
          jobDescription={jobDescription}
        />
      )}

      <p className="ai-analysis-disclaimer">
        These results come from HireLabs&apos; own models and
        rules and can be wrong. Check the evidence yourself,
        and never use them as the only basis for a hiring
        decision.
      </p>
    </section>
  );
}
