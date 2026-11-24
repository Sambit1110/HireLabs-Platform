"use client";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import FeedbackSummary from "@/components/dashboard/FeedbackSummary";
import { useEffect, useState } from "react";

import {
  barWidth,
  bestSystems,
  formatMetric,
  normalizeResults,
} from "@/lib/eval/results";
import { SAMPLE_MODEL_RESULTS } from "@/lib/fixtures/sample-model-results";

const RESULTS_URL = "/model-results.json";
const SHOW_SAMPLE_PREVIEW = process.env.NODE_ENV !== "production";

const KIND_LABELS: Record<string, string> = {
  ours: "Our model",
  baseline: "Baseline",
};

type Results = Extract<ReturnType<typeof normalizeResults>, { ok: true }>["results"];
type Task = Results["tasks"][number];

type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; results: Results };

function TaskSection({ task }: { task: Task }) {
  return (
    <section className="dashboard-card" aria-labelledby={`task-${task.id}`}>
      <h2 id={`task-${task.id}`}>{task.title}</h2>
      {task.description && <p className="eval-muted">{task.description}</p>}

      <div className="results-table-wrap" style={{ marginTop: 16 }}>
        <table className="results-table">
          <thead>
            <tr>
              <th scope="col">System</th>
              {task.metrics.map((metric) => (
                <th scope="col" key={metric.key}>
                  {metric.label}
                  <span className="results-system-kind">
                    {metric.higherIsBetter ? "higher is better" : "lower is better"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {task.systems.map((system) => (
              <tr key={system.name} className={system.kind === "ours" ? "is-ours" : undefined}>
                <th scope="row">
                  {system.name}
                  <span className="results-system-kind">{KIND_LABELS[system.kind]}</span>
                </th>

                {task.metrics.map((metric) => {
                  const best = bestSystems(task, metric).has(system.name);
                  return (
                    <td key={metric.key} className={best ? "is-best" : undefined}>
                      {formatMetric(system.values[metric.key], metric.unit)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="results-chart">
        {task.metrics.map((metric) => {
          const max = Math.max(
            0,
            ...task.systems.map((system) => system.values[metric.key] ?? 0)
          );

          return (
            <div key={metric.key}>
              <h4>
                {metric.label}{" "}
                <span className="eval-muted">
                  ({metric.higherIsBetter ? "longer bar is better" : "shorter bar is better"})
                </span>
              </h4>

              {task.systems.map((system) => {
                const value = system.values[metric.key];
                return (
                  <div className="results-bar-row" key={system.name}>
                    <span>{system.name}</span>
                    <span
                      className={`results-bar results-bar--${system.kind}`}
                      role="img"
                      aria-label={`${system.name}: ${formatMetric(value, metric.unit)}`}
                    >
                      <span style={{ width: `${barWidth(value, metric.unit, max)}%` }} />
                    </span>
                    <span>{formatMetric(value, metric.unit)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {task.metrics.some((metric) => metric.description) && (
        <ul className="results-metric-notes">
          {task.metrics
            .filter((metric) => metric.description)
            .map((metric) => (
              <li key={metric.key}>
                <strong>{metric.label}:</strong> {metric.description}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

function BiasSection({ bias }: { bias: NonNullable<Results["bias"]> }) {
  return (
    <section className="dashboard-card" aria-labelledby="bias-heading">
      <h2 id="bias-heading">Fairness check</h2>
      <p className="eval-muted">
        {bias.description ||
          "Identical resumes where only the name or gender was changed. A fair model gives the same score."}
        {bias.variants !== null && ` ${bias.variants} resumes tested.`}
      </p>

      <div className="results-table-wrap" style={{ marginTop: 16 }}>
        <table className="results-table">
          <thead>
            <tr>
              <th scope="col">System</th>
              <th scope="col">
                Avg score change
                <span className="results-system-kind">lower is better</span>
              </th>
              <th scope="col">
                Largest change
                <span className="results-system-kind">lower is better</span>
              </th>
              <th scope="col">
                Verdict flips
                <span className="results-system-kind">0 is the goal</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {bias.systems.map((system) => (
              <tr key={system.name} className={system.kind === "ours" ? "is-ours" : undefined}>
                <th scope="row">
                  {system.name}
                  <span className="results-system-kind">{KIND_LABELS[system.kind]}</span>
                </th>
                <td>{formatMetric(system.meanAbsDelta, "points")}</td>
                <td>{formatMetric(system.maxAbsDelta, "points")}</td>
                <td>{system.verdictFlips ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ModelResults() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    fetch(RESULTS_URL, { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;

        if (response.status === 404) {
          setState({ status: "missing" });
          return;
        }

        if (!response.ok) {
          throw new Error(`The results file could not be loaded (HTTP ${response.status}).`);
        }

        const parsed = normalizeResults(await response.json());

        if (!active) return;

        setState(
          "results" in parsed
            ? { status: "ready", results: parsed.results }
            : { status: "error", message: parsed.error }
        );
      })
      .catch((failure) => {
        if (active) {
          setState({
            status: "error",
            message: failure instanceof Error ? failure.message : "The results file could not be loaded.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const previewSample = () => {
    const parsed = normalizeResults(SAMPLE_MODEL_RESULTS);
    if (parsed.ok) setState({ status: "ready", results: parsed.results });
  };

  return (
    <main className="dashboard-shell">
      <DashboardHeader current="results" />

      <div className="dashboard-content">
        <div className="dashboard-heading">
          <div className="results-intro">
            <h1>Model results</h1>
            <p>
              How HireLabs&apos; own models compare with a simple keyword baseline,
              measured on a held-out test set that no model was trained on.
            </p>
          </div>
        </div>

        <FeedbackSummary />

        {state.status === "loading" && <p role="status">Loading results…</p>}

        {(state.status === "missing" || state.status === "error") && (
          <div className="dashboard-empty">
            <h2>No evaluation results yet</h2>
            <p className="eval-muted">
              {state.status === "error"
                ? state.message
                : "Results appear here once the evaluation script writes public/model-results.json."}
            </p>
            <p className="eval-muted">
              Run <code>python scripts/eval/run_all.py</code> (see docs/results/RESULTS_FORMAT.md).
            </p>

            {SHOW_SAMPLE_PREVIEW && (
              <button
                type="button"
                className="dashboard-secondary"
                style={{ marginTop: 16 }}
                onClick={previewSample}
                title="Development only: shows made-up numbers"
              >
                Preview with sample numbers
              </button>
            )}
          </div>
        )}

        {state.status === "ready" && (
          <>
            {state.results.sample && (
              <p className="sample-banner" role="note">
                SAMPLE DATA: these numbers are made up to preview the layout. They are not real results.
              </p>
            )}

            <p className="eval-muted">
              {[
                state.results.testSet.description,
                state.results.testSet.resumes !== null &&
                  `${state.results.testSet.resumes} test resumes`,
                state.results.testSet.pairs !== null &&
                  `${state.results.testSet.pairs} resume–job pairs`,
                state.results.generatedAt &&
                  `Generated ${new Date(state.results.generatedAt).toLocaleString()}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>

            {state.results.tasks.map((task) => (
              <TaskSection key={task.id} task={task} />
            ))}

            {state.results.bias && <BiasSection bias={state.results.bias} />}

            <p className="resume-note">
              Bold green values are the best result for each metric. Every model
              shown is the team&apos;s own and runs on our own machine.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
