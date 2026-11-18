
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Candidate = {
  id: string;
  candidate_name: string | null;
  candidate_title: string | null;
  extracted_skills: string[] | null;
  parsed_text: string | null;
  years_experience: number | null;
};

type AnalysisMode = "candidate" | "role";

type AnalysisResult = {
  mode: AnalysisMode;
  candidateId: string | null;
  role: string;
  data: unknown;
  generatedAt: string;
};

type ApiResponse = {
  success?: boolean;
  data?: {
    result?: unknown;
  };
  error?: {
    message?: string;
  } | string;
};

type AIAnalysisPanelProps = {
  candidates: Candidate[];
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

function candidateLabel(candidate: Candidate) {
  return (
    candidate.candidate_name?.trim() ||
    candidate.candidate_title?.trim() ||
    `Candidate ${candidate.id.slice(0, 8)}`
  );
}

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
}: {
  analysis: AnalysisResult;
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
        </div>

        <button
          type="button"
          className="dashboard-secondary"
          onClick={() => void copyReport()}
        >
          {copied ? "Copied" : "Copy report"}
        </button>
      </div>

      <p className="resume-note">
        Generated on{" "}
        {new Date(
          analysis.generatedAt
        ).toLocaleString()}.
        AI-generated insights are decision-support
        information and should be verified against
        resume evidence and job requirements.
      </p>

      {sections.length > 0 ? (
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
}: AIAnalysisPanelProps) {
  const [candidateId, setCandidateId] = useState("");
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [result, setResult] =
    useState<AnalysisResult | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const controllerRef = useRef<AbortController | null>(
    null
  );

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

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

  const roleReady = Boolean(
    role.trim() && jobDescription.trim()
  );

  const resetOutput = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;

    setBusy(false);
    setResult(null);
    setError("");
    setNotice("");
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
            };

      const response = await fetch("/api/ai-analyze", {
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
        role: role.trim(),
        candidateId:
          mode === "candidate" ? candidateId : null,
        data: payload.data.result,
        generatedAt: new Date().toISOString(),
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

  const cancelAnalysis = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;

    setBusy(false);
    setNotice("Analysis cancelled.");
  };

  return (
    <section
      className="dashboard-card ai-analysis"
      aria-labelledby="ai-analysis-heading"
    >
      <div className="dashboard-section-heading">
        <div>
          <p className="dashboard-eyebrow">
            AI RECRUITMENT INTELLIGENCE
          </p>

          <h2 id="ai-analysis-heading">
            Advanced AI analysis
          </h2>

          <p>
            Generate recruiter screening briefs and
            evidence-based candidate evaluations using
            your existing AI service.
          </p>
        </div>
      </div>

      <div className="ai-analysis-fields">
        <label className="dashboard-label">
          Target role

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
                {candidateLabel(candidate)}
                {" · "}
                {candidate.candidate_title || "No title"}
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
              {candidateLabel(selectedCandidate)}
            </h3>

            <p>
              {selectedCandidate.candidate_title ||
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
              {selectedCandidate.extracted_skills?.length
                ? selectedCandidate.extracted_skills.join(
                    ", "
                  )
                : "No skills extracted"}
            </p>

            {!candidateReady && (
              <p className="resume-note">
                Candidate evaluation requires parsed
                resume text.
              </p>
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

      {result && (
        <ResultDisplay
          key={`${result.mode}-${result.generatedAt}`}
          analysis={result}
        />
      )}

      <p
        className="resume-note"
        style={{ marginTop: 20 }}
      >
        AI evaluations may be incomplete or inaccurate.
        Recruiters should verify qualifications and
        supporting evidence. Do not use AI output as the
        sole basis for employment decisions.
      </p>
    </section>
  );
}
