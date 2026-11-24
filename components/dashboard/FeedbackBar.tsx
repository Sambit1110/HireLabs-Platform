"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Props = {
  resumeId: string;
  jobDescription: string;
  modelUsed: string;
  modelScore: number | null;
  modelVerdict: string | null;
};

function Thumb({ down = false }: { down?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" style={down ? { transform: "rotate(180deg)" } : undefined}>
      <path
        d="M6.5 9.2V16.5H4a1 1 0 0 1-1-1V10.2a1 1 0 0 1 1-1h2.5Zm0 0 3-5.7a1.6 1.6 0 0 1 2.9 1.2l-.6 2.9h3.6a1.6 1.6 0 0 1 1.6 1.9l-1 5.3a1.6 1.6 0 0 1-1.6 1.3H6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * "Was this score right?" under a candidate evaluation. Agree / Disagree, an optional own score
 * and a note. Each saved judgement becomes a human label (see scripts/evaluator/export_feedback.mjs).
 */
export default function FeedbackBar({ resumeId, jobDescription, modelUsed, modelScore, modelVerdict }: Props) {
  const [agrees, setAgrees] = useState<boolean | null>(null);
  const [score, setScore] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const scoreValue = score.trim() === "" ? null : Number(score);
  const scoreInvalid = scoreValue !== null && (!Number.isInteger(scoreValue) || scoreValue < 0 || scoreValue > 100);
  const canSave = (agrees !== null || scoreValue !== null) && !scoreInvalid && state !== "saving";

  const choose = (value: boolean) => {
    setAgrees(value);
    if (state === "saved" || state === "error") setState("idle");
  };

  const save = async () => {
    if (!canSave) return;
    setState("saving");
    setMessage("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, jobDescription, modelUsed, modelScore, modelVerdict, agrees, humanScore: scoreValue, note }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success !== true) {
        throw new Error(payload.error?.message || "Your feedback could not be saved.");
      }
      setState("saved");
      setMessage("Saved. Thank you: this becomes a human label for testing and training our models.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Your feedback could not be saved.");
    }
  };

  return (
    <section className="eval-panel feedback-bar" aria-labelledby="feedback-heading">
      <h3 id="feedback-heading">Was this score right?</h3>
      <p className="eval-muted">
        Your judgement is saved as a human label, so we can measure and improve the models.
      </p>

      <div className="feedback-bar__choices" role="group" aria-label="Do you agree with this evaluation?">
        <button
          type="button"
          className={`dashboard-secondary feedback-choice${agrees === true ? " is-selected" : ""}`}
          aria-pressed={agrees === true}
          onClick={() => choose(true)}
        >
          <Thumb /> Agree
        </button>
        <button
          type="button"
          className={`dashboard-secondary feedback-choice${agrees === false ? " is-selected is-disagree" : ""}`}
          aria-pressed={agrees === false}
          onClick={() => choose(false)}
        >
          <Thumb down /> Disagree
        </button>
      </div>

      <div className="feedback-bar__fields">
        <label className="dashboard-label">
          Your score (optional, 0–100)
          <input
            className="ai-analysis-input feedback-bar__score"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            value={score}
            aria-invalid={scoreInvalid || undefined}
            onChange={(event) => {
              setScore(event.target.value);
              if (state === "saved") setState("idle");
            }}
            placeholder={modelScore === null ? "e.g. 70" : `Model said ${modelScore}`}
          />
        </label>
        <label className="dashboard-label">
          Note (optional)
          <input
            className="ai-analysis-input"
            type="text"
            maxLength={1000}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              if (state === "saved") setState("idle");
            }}
            placeholder="What did the model miss?"
          />
        </label>
      </div>
      {scoreInvalid && <p className="text-error">Use a whole number from 0 to 100.</p>}

      <div className="feedback-bar__actions">
        <button type="button" className="dashboard-secondary" disabled={!canSave} onClick={() => void save()}>
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save feedback"}
        </button>
        {message && (
          <p className={state === "error" ? "text-error" : "eval-muted"} role={state === "error" ? "alert" : "status"}>
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
