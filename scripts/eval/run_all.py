"""Run explicit development evaluation with deterministic baselines and injected adapters."""

import argparse
from datetime import datetime, timezone
import importlib
import json
import math
from pathlib import Path
import platform
import sys
import time
from collections.abc import Mapping

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.eval.adapters import unavailable_model_adapters
from scripts.eval.baselines import evaluator_keyword_baseline, parser_keyword_baseline, rank_candidates
from scripts.eval.cache import ResponseCache
from scripts.eval.config import ENTITY_LABELS, RELEVANCE_THRESHOLD
from scripts.eval.evaluator_eval import evaluate_candidates
from scripts.eval.loader import load_dataset
from scripts.eval.matching_eval import evaluate_rankings, judgments_from_pairs
from scripts.eval.metrics import evaluator_output_is_valid
from scripts.eval.provenance import EvaluationRun, EvaluationTaskResult, _is_loader_dataset
from scripts.eval.parser_eval import evaluate_parser
from scripts.eval.reporting import write_reports
from scripts.eval.results_writer import build_task, create_results_artifact, write_results


_ADAPTER_SYSTEMS = {
    "parser": {"gemini_parser": "Gemini", "spacy_parser": "hirelabs-parser"},
    "matching": {"gemini_embeddings": "Gemini embeddings", "hirelabs_matcher": "hirelabs-matcher"},
    "evaluator": {"gemini_evaluator": "Gemini", "hirelabs_evaluator": "hirelabs-evaluator"},
}
_ADAPTER_KEYS = {key for task_adapters in _ADAPTER_SYSTEMS.values() for key in task_adapters}


def _as_evaluator_schema(result):
    """Shape the deterministic baseline to the shared evaluator contract."""
    value = {
        "candidate_summary": "Keyword overlap baseline.",
        "relevant_experience_summary": "",
        "technical_strengths": result["matched"], "relevant_projects": [],
        "fit_verdict": result["fit_verdict"], "fit_score": result["fit_score"], "confidence": 0,
        "strengths": result["matched"], "gaps": result["missing"],
        "evidence_signals": [], "risk_flags": [], "interview_questions": [],
        "recommendation": "Review against the full resume and job requirements.",
        "skill_gap_analysis": {
            "demonstrated_skills": result["matched"], "partially_demonstrated_skills": [],
            "missing_required_skills": result["missing"], "missing_preferred_skills": [],
            "unverified_skills": [], "skill_gap_summary": "",
        },
        "recruiter_insights": {
            "strongest_alignment": result["matched"], "areas_for_verification": [],
            "suggested_interview_focus": [], "overall_assessment": "Keyword baseline only.",
        },
    }
    return json.dumps(value, ensure_ascii=False, allow_nan=False, sort_keys=True)


def _adapter_output(adapter, *, task, payload, cache):
    """Return a model prediction and original call duration, using cache only when configured."""
    if not _adapter_enabled(adapter):
        return None
    model_id = getattr(adapter, "model_id", None) or getattr(adapter, "name", adapter.__class__.__name__)
    cache_key = None
    if cache is not None:
        cache_key = cache.key(task=task, adapter=getattr(adapter, "name", model_id), model=model_id, input_value=payload)
        cached = cache.get(cache_key)
        if cached is not None:
            if (not isinstance(cached, dict) or set(cached) != {"prediction", "duration_seconds"}
                    or isinstance(cached["duration_seconds"], bool)
                    or not isinstance(cached["duration_seconds"], (int, float))
                    or not math.isfinite(cached["duration_seconds"])
                    or cached["duration_seconds"] < 0):
                raise ValueError(f"Invalid cached {task} adapter response envelope.")
            return cached["prediction"], float(cached["duration_seconds"])
    started = time.perf_counter()
    try:
        prediction = adapter.predict(payload)
    except Exception as exc:
        raise RuntimeError(f"{task} adapter {getattr(adapter, 'name', model_id)} failed.") from exc
    duration = time.perf_counter() - started
    if cache is not None:
        cache.put(cache_key, {"prediction": prediction, "duration_seconds": duration})
    return prediction, duration


def _adapter_enabled(adapter):
    status = getattr(adapter, "status", None)
    return not callable(status) or bool(status().available)


def _parser_values(metrics):
    values = {}
    for label in ENTITY_LABELS:
        for metric in ("precision", "recall", "f1"):
            values[f"{metric}_{label.lower()}"] = metrics[label][metric]
    values.update({
        "precision_micro": metrics["overall"]["precision"],
        "recall_micro": metrics["overall"]["recall"],
        "f1_micro": metrics["overall"]["f1"],
    })
    return values


def evaluate_dataset(dataset, *, adapters=None, cache=None):
    """Evaluate available baselines plus only explicitly injected model adapters.

    Adapter payloads are task-specific and documented in ``adapters.py``. An
    absent adapter stays null in the result; no model output is synthesized.
    """
    if not _is_loader_dataset(dataset):
        raise TypeError("Evaluation requires a dataset returned by load_dataset().")
    adapters = adapters or {}
    if not isinstance(adapters, Mapping) or set(adapters) - _ADAPTER_KEYS:
        raise ValueError("Adapters must be a mapping with supported task adapter identifiers.")
    if any(not callable(getattr(adapter, "predict", None)) for adapter in adapters.values()):
        raise TypeError("Every configured model adapter must implement predict(inputs).")

    parser_values_by_system = {"Keyword baseline": _parser_values(evaluate_parser(
        dataset.parser_rows,
        {row["id"]: parser_keyword_baseline(row["text"]) for row in dataset.parser_rows},
    ))}
    for adapter_key, system_name in _ADAPTER_SYSTEMS["parser"].items():
        adapter = adapters.get(adapter_key)
        if adapter is None or not _adapter_enabled(adapter):
            continue
        predictions = {}
        for row in dataset.parser_rows:
            result = _adapter_output(adapter, task="parser", cache=cache,
                                     payload={"document_id": row["id"], "text": row["text"]})
            if result is None:
                raise ValueError(f"Parser adapter {adapter_key} returned no prediction for a document.")
            predictions[row["id"]] = result[0]
        parser_values_by_system[system_name] = _parser_values(evaluate_parser(dataset.parser_rows, predictions))

    relevant, judged = judgments_from_pairs(dataset.pairs)
    rankings_by_system = {"Keyword baseline": {}}
    for job_id, candidate_ids in judged.items():
        records = [{"id": resume_id, "text": dataset.resumes[resume_id]} for resume_id in candidate_ids]
        rankings_by_system["Keyword baseline"][job_id] = [
            item["id"] for item in rank_candidates(records, dataset.jobs[job_id])
        ]
    matching_values_by_system = {}
    for adapter_key, system_name in _ADAPTER_SYSTEMS["matching"].items():
        adapter = adapters.get(adapter_key)
        if adapter is None or not _adapter_enabled(adapter):
            continue
        rankings = {}
        for job_id, candidate_ids in judged.items():
            candidates = [{"id": rid, "text": dataset.resumes[rid]} for rid in sorted(candidate_ids)]
            result = _adapter_output(adapter, task="matching", cache=cache, payload={
                "query_id": job_id, "job_description": dataset.jobs[job_id], "candidates": candidates,
            })
            if result is None:
                raise ValueError(f"Matcher adapter {adapter_key} returned no ranking for a judged query.")
            rankings[job_id] = result[0]
        matching_values_by_system[system_name] = rankings
    matching_values_by_system["Keyword baseline"] = rankings_by_system["Keyword baseline"]
    matching_task_values = {}
    for system_name, rankings in matching_values_by_system.items():
        metrics = evaluate_rankings(rankings, dataset.pairs)
        matching_task_values[system_name] = {
            "recall_at_5": metrics["recall_at_5"]["value"],
            "mrr": metrics["mrr"]["value"],
            "success_at_5": metrics["success_at_5"]["value"],
        }

    evaluator_pairs = [pair for pair in dataset.pairs if pair["label_source"] in {"human", "gemini_checked"}]
    evaluator_responses = {"Keyword baseline": {}}
    evaluator_times = {"Keyword baseline": {}}
    for pair in evaluator_pairs:
        started = time.perf_counter()
        baseline = evaluator_keyword_baseline(dataset.resumes[pair["resume_id"]], dataset.jobs[pair["jd_id"]])
        evaluator_times["Keyword baseline"][pair["pair_id"]] = time.perf_counter() - started
        output = _as_evaluator_schema(baseline)
        if evaluator_output_is_valid(output):
            evaluator_responses["Keyword baseline"][pair["pair_id"]] = output
    for adapter_key, system_name in _ADAPTER_SYSTEMS["evaluator"].items():
        adapter = adapters.get(adapter_key)
        if adapter is None or not _adapter_enabled(adapter):
            continue
        evaluator_responses[system_name], evaluator_times[system_name] = {}, {}
        for pair in evaluator_pairs:
            result = _adapter_output(adapter, task="evaluator", cache=cache, payload={
                "pair_id": pair["pair_id"], "resume_text": dataset.resumes[pair["resume_id"]],
                "job_description": dataset.jobs[pair["jd_id"]],
            })
            if result is not None:
                evaluator_responses[system_name][pair["pair_id"]] = result[0]
                evaluator_times[system_name][pair["pair_id"]] = result[1]
    evaluator_values_by_system = {}
    for system_name, responses in evaluator_responses.items():
        measured = evaluate_candidates(evaluator_pairs, responses, evaluator_times[system_name])
        evaluator_values_by_system[system_name] = {key: metric["value"] for key, metric in measured.items()}

    task_results = [
        build_task("parser", parser_values_by_system),
        build_task("matching", matching_task_values),
        build_task("evaluator", evaluator_values_by_system),
    ]
    # Construct provenance objects only inside this execution path, after each
    # task's metrics were computed from this exact loader-created dataset.
    execution_id = object()
    evaluated_tasks = []
    for task in task_results:
        result = object.__new__(EvaluationTaskResult)
        object.__setattr__(result, "split", dataset.split)
        object.__setattr__(result, "manifest_sha256", dataset.manifest_sha256)
        object.__setattr__(result, "_payload", json.dumps(
            task, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False
        ))
        object.__setattr__(result, "_dataset", dataset)
        object.__setattr__(result, "_execution_id", execution_id)
        evaluated_tasks.append(result)

    run = object.__new__(EvaluationRun)
    object.__setattr__(run, "split", dataset.split)
    object.__setattr__(run, "manifest_sha256", dataset.manifest_sha256)
    object.__setattr__(run, "task_results", tuple(evaluated_tasks))
    object.__setattr__(run, "_dataset", dataset)
    object.__setattr__(run, "_execution_id", execution_id)
    return run


def build_error_analysis(dataset):
    """Return baseline split-wide counts only; never expose IDs, text or outputs."""
    predictions = {row["id"]: parser_keyword_baseline(row["text"]) for row in dataset.parser_rows}
    parser_scores = evaluate_parser(dataset.parser_rows, predictions)
    parser_report = {
        label: {key: parser_scores[label][key] for key in ("false_positives", "false_negatives")}
        for label in ENTITY_LABELS
    }

    relevant, judged = judgments_from_pairs(dataset.pairs)
    missed_relevant, eligible_queries = 0, 0
    for job_id, candidates in judged.items():
        ranked = rank_candidates([{"id": rid, "text": dataset.resumes[rid]} for rid in candidates], dataset.jobs[job_id])
        hits = {item["id"] for item in ranked[:5]} & relevant.get(job_id, set())
        if relevant.get(job_id):
            eligible_queries += 1
            missed_relevant += len(relevant[job_id] - hits)

    verdict_errors = score_errors = 0
    score_error_bands = {"0_to_10": 0, "over_10_to_25": 0, "over_25": 0}
    for pair in dataset.pairs:
        if pair["label_source"] not in {"human", "gemini_checked"}:
            continue
        result = evaluator_keyword_baseline(dataset.resumes[pair["resume_id"]], dataset.jobs[pair["jd_id"]])
        verdict_errors += int(result["fit_verdict"] != pair["fit_verdict"])
        if result["fit_score"] is not None:
            error = abs(result["fit_score"] - pair["fit_score"])
            score_errors += 1
            score_error_bands["0_to_10" if error <= 10 else "over_10_to_25" if error <= 25 else "over_25"] += 1
    return {
        "parser": {"false_positives_and_negatives_by_label": parser_report},
        "matching": {"eligible_queries": eligible_queries, "missed_relevant_candidates": missed_relevant},
        "evaluator": {"verdict_errors": verdict_errors, "scored_pairs": score_errors,
                      "absolute_score_error_bands": score_error_bands},
    }


def _load_adapter_factory(specification):
    if not specification or ":" not in specification:
        raise ValueError("Adapter factory must use the module.path:callable format.")
    module_name, attribute = specification.split(":", 1)
    factory = getattr(importlib.import_module(module_name), attribute)
    if not callable(factory):
        raise TypeError("Configured adapter factory is not callable.")
    adapters = factory()
    if not isinstance(adapters, Mapping) or set(adapters) - _ADAPTER_KEYS:
        raise ValueError("Adapter factory returned unsupported adapter identifiers.")
    if any(not callable(getattr(adapter, "predict", None)) for adapter in adapters.values()):
        raise TypeError("Adapter factory values must implement predict(inputs).")
    return adapters


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset-root", required=True, help="Explicit prepared data root; never discovered automatically.")
    parser.add_argument("--split", choices=("train", "dev"), default="dev")
    parser.add_argument("--output", required=True, help="Canonical development aggregate JSON path.")
    parser.add_argument("--reports-dir", help="Optional comparison, chart, error, and report-section directory.")
    parser.add_argument("--adapter-factory", help="Optional explicit module.path:callable returning adapter instances.")
    parser.add_argument("--cache-dir", help="Optional private local directory for adapter responses.")
    args = parser.parse_args(argv)
    output_path = Path(args.output).expanduser().resolve()
    repository_root = Path(__file__).resolve().parents[2]
    protected_paths = {
        (repository_root / "results/results.json").resolve(),
        (repository_root / "public/model-results.json").resolve(),
    }
    if output_path in protected_paths or repository_root / "public" in output_path.parents:
        parser.error("Development outputs cannot overwrite final or public result files.")
    output_dir = Path(args.reports_dir).expanduser().resolve() if args.reports_dir else None
    if output_dir is not None and (output_dir == repository_root / "public"
                                   or repository_root / "public" in output_dir.parents):
        parser.error("Development reports cannot be written under public/.")
    cache_dir = Path(args.cache_dir).expanduser().resolve() if args.cache_dir else None
    if cache_dir is not None and (cache_dir == repository_root / "public"
                                  or repository_root / "public" in cache_dir.parents):
        parser.error("Adapter response cache must remain outside public/.")
    if output_dir is not None and (output_dir == output_path or output_dir in output_path.parents):
        parser.error("Canonical result and report outputs must not overlap.")
    if cache_dir is not None and (output_path == cache_dir or cache_dir in output_path.parents):
        parser.error("Canonical result output cannot be inside the adapter cache directory.")
    if cache_dir is not None and output_dir is not None and (
        cache_dir == output_dir or cache_dir in output_dir.parents or output_dir in cache_dir.parents
    ):
        parser.error("Adapter cache and report outputs must use separate directories.")

    dataset = load_dataset(args.dataset_root, args.split)
    adapters = _load_adapter_factory(args.adapter_factory) if args.adapter_factory else {}
    cache = ResponseCache(cache_dir) if cache_dir else None
    evaluation_result = evaluate_dataset(dataset, adapters=adapters, cache=cache)
    enabled_adapters = []
    for key, adapter in adapters.items():
        if _adapter_enabled(adapter):
            enabled_adapters.append(key)
    configured_adapters = ["keyword_parser", "skill_overlap_matcher", "keyword_evaluator", *sorted(enabled_adapters)]
    model_ids = {
        key: getattr(adapter, "model_id", None) or getattr(adapter, "name", key)
        for key, adapter in adapters.items() if key in enabled_adapters
    }
    artifact = create_results_artifact(
        split=args.split, resumes=dataset.split_resume_count, pairs=len(dataset.pairs),
        evaluation_result=evaluation_result,
        generated_at=datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        evaluation_config={"mode": "development", "adapters": configured_adapters,
                           "model_ids": model_ids,
                           "ranking_k": 5, "relevance_threshold": RELEVANCE_THRESHOLD, "seed": 0},
        reproducibility={"runner_version": "1", "python_version": platform.python_version(),
                         "cache_enabled": cache is not None},
        source_dataset=dataset,
    )
    write_results(artifact, output_path, evaluation_result=evaluation_result)
    if output_dir:
        output_dir.mkdir(parents=True, exist_ok=True)
        write_reports(artifact, output_dir / "comparison.md", output_dir / "chart-data.json",
                      output_dir / "error-analysis.json", error_analysis=build_error_analysis(dataset),
                      evaluation_section_path=output_dir / "evaluation-section.md")
    statuses = {}
    unavailable = unavailable_model_adapters()
    for key in sorted(_ADAPTER_KEYS):
        adapter = adapters.get(key)
        status = getattr(adapter, "status", None) if adapter is not None else None
        statuses[key] = ("available" if not callable(status) or status().available
                         else status().reason) if adapter is not None else unavailable.get(key, None).reason
    print(json.dumps({"split": args.split, "completed": True, "adapters": statuses}, sort_keys=True))


if __name__ == "__main__":
    main()
