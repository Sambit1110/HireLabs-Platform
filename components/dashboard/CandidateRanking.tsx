"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { describeModel, type ModelInfo } from "@/lib/ai/model-info";
import { SAMPLE_MATCHES } from "@/lib/fixtures/sample-evaluation";
import ModelBadge from "@/components/dashboard/ModelBadge";
import { isParsedStatus } from "@/lib/resume/status";

const SHOW_SAMPLE_PREVIEW = process.env.NODE_ENV !== "production";
const MAX_JOB_DESCRIPTION = 12000;

type RankableResume = {
  id: string;
  file_name: string;
  candidate_name: string | null;
  candidate_title: string | null;
  extracted_skills: string[] | null;
  processing_status: string;
  parsed_text: string | null;
};

/** hirelabs-llm's second opinion on one resume (see docs/hirelabs-llm.md). */
type LlmFit = {
  score: number;
  verdict: string;
  missing_skills: string[];
};

/**
 * One row of the /api/match response (see docs/api/MATCH_CONTRACT.md).
 */
type MatchRow = {
  id: string;
  file_name?: string;
  candidate_name?: string | null;
  candidate_title?: string | null;
  similarity: number;
  llm_fit?: LlmFit | null;
};

type Ranking = {
  matches: MatchRow[];
  model: ModelInfo;
  sample: boolean;
};

function readLlmFit(value: unknown): LlmFit | null {
  if (typeof value !== "object" || value === null) return null;
  const fit = value as Partial<LlmFit>;
  if (typeof fit.score !== "number" || !Number.isFinite(fit.score) || typeof fit.verdict !== "string") {
    return null;
  }
  return {
    score: Math.round(Math.min(100, Math.max(0, fit.score))),
    verdict: fit.verdict,
    missing_skills: Array.isArray(fit.missing_skills)
      ? fit.missing_skills.filter((skill): skill is string => typeof skill === "string").slice(0, 8)
      : [],
  };
}

type CandidateRankingProps = {
  resumes: RankableResume[];
  onExplain: (candidateId: string, role: string, jobDescription: string) => void;
};

function parseMatches(value: unknown): MatchRow[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (row): row is MatchRow =>
        typeof row === "object" &&
        row !== null &&
        typeof (row as MatchRow).id === "string" &&
        typeof (row as MatchRow).similarity === "number" &&
        Number.isFinite((row as MatchRow).similarity)
    )
    .map((row) => ({ ...row, llm_fit: readLlmFit(row.llm_fit) }))
    .sort((a, b) => b.similarity - a.similarity);
}

function similarityPercent(similarity: number) {
  return Math.round(Math.min(1, Math.max(0, similarity)) * 100);
}

export default function CandidateRanking({ resumes, onExplain }: CandidateRankingProps) {
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const byId = new Map(resumes.map((resume) => [resume.id, resume]));
  const parsedCount = resumes.filter((resume) => isParsedStatus(resume.processing_status)).length;

  const rank = async () => {
    if (busy || !jobDescription.trim()) return;

    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;

    setBusy(true);
    setError("");
    setRanking(null);

    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();

      if (!session?.access_token) {
        throw new Error("Your session expired. Please sign in again.");
      }

      const response = await fetch("/api/match", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_description: jobDescription.trim(),
          match_count: 10,
        }),
      });

      if (response.status === 404) {
        throw new Error(
          "Semantic matching isn't available yet: the /api/match endpoint hasn't been added to this build."
        );
      }

      let payload: { success?: boolean; data?: Record<string, unknown>; error?: { message?: string } };

      try {
        payload = await response.json();
      } catch {
        throw new Error("The matching service returned an invalid response.");
      }

      if (!response.ok || payload.success !== true) {
        throw new Error(payload.error?.message || "Candidates could not be ranked.");
      }

      if (controller.signal.aborted) return;

      setRanking({
        matches: parseMatches(payload.data?.matches),
        model: describeModel(payload.data),
        sample: false,
      });
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(failure instanceof Error ? failure.message : "Candidates could not be ranked.");
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setBusy(false);
      }
    }
  };

  const previewSample = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setBusy(false);
    setError("");
    setRanking({
      matches: SAMPLE_MATCHES,
      model: describeModel({ model_used: "hirelabs-matcher" }),
      sample: true,
    });
  };

  return (
    <section className="dashboard-card" aria-labelledby="ranking-heading">
      <div className="dashboard-section-heading" style={{ marginTop: 0 }}>
        <div>
          <p className="dashboard-eyebrow">SEMANTIC MATCHING</p>
          <h2 id="ranking-heading">Rank candidates for a job</h2>
          <p>
            Paste a job description to rank your {parsedCount} parsed resume
            {parsedCount === 1 ? "" : "s"} by how closely they match.
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
            onChange={(event) => setRole(event.target.value)}
            placeholder="e.g. Backend Engineer"
          />
        </label>

        <label className="dashboard-label">
          Job description
          <textarea
            className="ai-analysis-input"
            value={jobDescription}
            maxLength={MAX_JOB_DESCRIPTION}
            rows={5}
            disabled={busy}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Paste responsibilities, required skills and qualifications."
          />
        </label>
      </div>

      <div className="ai-analysis-actions" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="dashboard-secondary"
          disabled={busy || !jobDescription.trim() || parsedCount === 0}
          onClick={() => void rank()}
        >
          {busy ? "Ranking…" : "Rank candidates"}
        </button>

        {SHOW_SAMPLE_PREVIEW && !busy && (
          <button
            type="button"
            className="dashboard-secondary"
            onClick={previewSample}
            title="Development only: shows fictional data"
          >
            Preview sample ranking
          </button>
        )}
      </div>

      {parsedCount === 0 && (
        <p className="resume-note" style={{ marginTop: 12 }}>
          Upload and parse at least one resume to rank candidates.
        </p>
      )}

      {error && (
        <p className="dashboard-alert" role="alert" style={{ marginTop: 16 }}>
          {error}
        </p>
      )}

      {ranking && (
        <div className="ranking" aria-live="polite">
          <div className="ranking__meta">
            <ModelBadge model={ranking.model} />
            <span className="eval-muted">
              {ranking.matches.length} candidate{ranking.matches.length === 1 ? "" : "s"} ranked
            </span>
          </div>

          {ranking.sample && (
            <p className="sample-banner" role="note">
              SAMPLE DATA: fictional candidates for previewing the layout. Not a real ranking.
            </p>
          )}

          {ranking.model.kind === "placeholder" && (
            <p className="sample-banner" role="note">
              The embedding service isn&apos;t running, so these scores come from an offline
              placeholder and don&apos;t reflect real similarity. Start the hirelabs-matcher
              service (see README) for a real ranking.
            </p>
          )}

          {ranking.matches.length === 0 ? (
            <p className="eval-empty">No parsed resumes could be matched to this job description.</p>
          ) : (
            <ol className="ranking__list">
              {ranking.matches.map((match, index) => {
                const resume = byId.get(match.id);
                const name =
                  resume?.candidate_name?.trim() ||
                  match.candidate_name?.trim() ||
                  (resume?.file_name || match.file_name || "Unnamed resume").replace(/\.[^.]+$/, "");
                const title = resume?.candidate_title || match.candidate_title || "Title not extracted";
                const skills = (resume?.extracted_skills || []).slice(0, 6);
                const percent = similarityPercent(match.similarity);
                const canExplain = Boolean(resume?.parsed_text?.trim()) && !ranking.sample;
                const fit = match.llm_fit;

                return (
                  <li key={match.id} className="ranking__item">
                    <span className="ranking__rank">#{index + 1}</span>

                    <div className="ranking__body">
                      <p className="ranking__name">{name}</p>
                      <p className="eval-muted">{title}</p>

                      {skills.length > 0 && (
                        <ul className="eval-chips">
                          {skills.map((skill) => (
                            <li key={skill} className="eval-chip eval-chip--neutral">
                              {skill}
                            </li>
                          ))}
                        </ul>
                      )}

                      {fit && (
                        <div className="ranking__llm">
                          <p className="eval-muted">
                            hirelabs-llm fit: <strong>{fit.score}/100</strong> ({fit.verdict})
                          </p>
                          {fit.missing_skills.length > 0 && (
                            <ul className="eval-chips" aria-label="Required skills not found in the resume">
                              {fit.missing_skills.map((skill) => (
                                <li key={skill} className="eval-chip eval-chip--missing">
                                  Missing: {skill}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="ranking__score">
                      <span>
                        <strong>{percent}%</strong> match
                      </span>
                      <span
                        className="ranking__bar"
                        role="img"
                        aria-label={`${percent}% similarity`}
                      >
                        <span style={{ width: `${percent}%` }} />
                      </span>

                      <button
                        type="button"
                        className="dashboard-secondary"
                        disabled={!canExplain}
                        title={
                          canExplain
                            ? "Open the full AI evaluation for this candidate"
                            : "Available for your own parsed resumes"
                        }
                        onClick={() => onExplain(match.id, role, jobDescription)}
                      >
                        Explain score
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <p className="resume-note">
            Similarity measures how closely the resume text matches the job description.
            It is a starting point for review, not a hiring decision.
          </p>

          {ranking.matches.some((match) => match.llm_fit) && (
            <p className="resume-note">
              hirelabs-llm fit is a second opinion from the team&apos;s own language model, built
              from scratch. It is experimental: it learned from template-style resumes, so it can
              under-score resumes written another way, and it does not change the order above.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
