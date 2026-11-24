"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { fetchWithNetworkRetry } from "@/lib/api/fetch-retry";

type Summary = {
  count: number;
  votes: number;
  agree_rate: number | null;
  scored: number;
  spearman: number | null;
  mean_abs_error: number | null;
  verdict_agreement: number | null;
};

type State =
  | { status: "loading" }
  | { status: "ready"; summary: Summary }
  | { status: "unavailable"; message: string };

const percent = (value: number | null) => (value === null ? "–" : `${Math.round(value * 100)}%`);

/** How well the models agree with this recruiter's "Was this score right?" feedback. */
export default function FeedbackSummary() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session?.access_token) throw new Error("Sign in to see your feedback.");
        const response = await fetchWithNetworkRetry("/api/feedback", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success !== true) throw new Error(payload.error?.message || "Feedback could not be loaded.");
        if (active) setState({ status: "ready", summary: payload.data.summary as Summary });
      } catch (error) {
        if (active) setState({ status: "unavailable", message: error instanceof Error ? error.message : "Feedback could not be loaded." });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="dashboard-card feedback-summary" aria-labelledby="feedback-summary-heading">
      <h2 id="feedback-summary-heading">Recruiter feedback</h2>
      <p>How often the fit score matches your own judgement, from the &ldquo;Was this score right?&rdquo; answers under each evaluation.</p>

      {state.status === "loading" && <p className="eval-muted" role="status">Loading feedback…</p>}
      {state.status === "unavailable" && <p className="eval-muted">{state.message}</p>}
      {state.status === "ready" && state.summary.count === 0 && (
        <p className="eval-muted">No feedback yet. Open any candidate evaluation and answer &ldquo;Was this score right?&rdquo;.</p>
      )}
      {state.status === "ready" && state.summary.count > 0 && (
        <dl className="feedback-summary__stats">
          <div>
            <dt>Evaluations reviewed</dt>
            <dd>{state.summary.count}</dd>
          </div>
          <div>
            <dt>You agreed</dt>
            <dd>{percent(state.summary.agree_rate)}</dd>
            <span className="eval-muted">of {state.summary.votes} votes</span>
          </div>
          <div>
            <dt>Verdict matches</dt>
            <dd>{percent(state.summary.verdict_agreement)}</dd>
            <span className="eval-muted">strong / moderate / weak</span>
          </div>
          <div>
            <dt>Score correlation</dt>
            <dd>{state.summary.spearman === null ? "–" : state.summary.spearman.toFixed(2)}</dd>
            <span className="eval-muted">
              {state.summary.scored < 3 ? "needs 3+ of your scores" : `Spearman, ${state.summary.scored} scores · off by ${state.summary.mean_abs_error} on average`}
            </span>
          </div>
        </dl>
      )}
    </section>
  );
}
