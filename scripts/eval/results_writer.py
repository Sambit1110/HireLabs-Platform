"""Strict aggregate-only result schemas and atomic output writing."""

from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import platform
import re
import tempfile

from .provenance import EvaluationRun


class ResultsValidationError(ValueError):
    """An evaluation artifact is outside the approved aggregate schema."""


_TASKS = {
    "parser": {
        "title": "Resume parsing",
        "description": "Exact character-span extraction against human annotations.",
        "systems": {
            "Keyword baseline": "baseline",
            "Gemini": "gemini",
            "hirelabs-parser": "ours",
        },
        "metrics": {},
    },
    "matching": {
        "title": "Resume-job matching",
        "description": "Rank explicitly judged resume candidates for each job query.",
        "systems": {
            "Keyword baseline": "baseline",
            "Gemini embeddings": "gemini",
            "hirelabs-matcher": "ours",
        },
        "metrics": {
            "recall_at_5": ("Recall@5", True, "ratio", "Relevant results in the top five divided by all judged relevant results for the query; macro-averaged by query."),
            "mrr": ("MRR", True, "ratio", "Macro-averaged reciprocal rank of the first relevant result."),
            "success_at_5": ("Success@5", True, "ratio", "Share of eligible jobs with at least one relevant resume in the top five."),
        },
    },
    "evaluator": {
        "title": "Candidate evaluation",
        "description": "Structured candidate assessment against human-reviewed labels.",
        "systems": {
            "Keyword baseline": "baseline",
            "Gemini": "gemini",
            "hirelabs-evaluator": "ours",
        },
        "metrics": {
            "verdict_accuracy": ("Verdict accuracy", True, "percent", "Schema-valid predictions matching the human fit verdict, divided by scored verdicts."),
            "fit_score_mae": ("Fit-score MAE", False, "points", "Mean absolute fit-score error over schema-valid outputs with numeric gold scores."),
            "valid_json_percentage": ("Valid JSON", True, "percent", "Strict JSON outputs matching the evaluator schema, divided by all gold pairs."),
            "average_response_time_seconds": ("Average response time", False, "seconds", "Mean finite non-negative latency over recorded attempts."),
        },
    },
}

_PARSER_SYSTEMS = _TASKS["parser"]["systems"]
_PARSER_METRICS = {}
for _label in ("NAME", "TITLE", "SKILL", "YEARS_EXPERIENCE", "DEGREE", "COMPANY"):
    _suffix = _label.lower()
    _PARSER_METRICS[f"precision_{_suffix}"] = (f"{_label} precision", True, "ratio", f"Exact-span precision for {_label} entities.")
    _PARSER_METRICS[f"recall_{_suffix}"] = (f"{_label} recall", True, "ratio", f"Exact-span recall for {_label} entities.")
    _PARSER_METRICS[f"f1_{_suffix}"] = (f"{_label} F1", True, "ratio", f"Exact-span F1 for {_label} entities.")
_PARSER_METRICS.update({
    "precision_micro": ("Micro precision", True, "ratio", "Exact-span precision micro-aggregated across the six labels."),
    "recall_micro": ("Micro recall", True, "ratio", "Exact-span recall micro-aggregated across the six labels."),
    "f1_micro": ("Micro F1", True, "ratio", "Exact-span F1 micro-aggregated across the six labels."),
})
_TASKS["parser"]["metrics"] = _PARSER_METRICS

_ALLOWED_MODES = {"development", "final"}
_ALLOWED_ADAPTERS = {
    "keyword_parser", "spacy_parser", "gemini_parser",
    "skill_overlap_matcher", "hirelabs_matcher", "gemini_embeddings",
    "keyword_evaluator", "gemini_evaluator", "hirelabs_evaluator",
}


def _is_count(value):
    return type(value) is int and value >= 0


def _is_number(value):
    return type(value) in (int, float) and math.isfinite(value)


def _ratio_bounds(unit):
    if unit == "ratio":
        return (0, 1)
    if unit == "percent":
        return (0, 100)
    return None


def build_task(task_id, values_by_system):
    """Build a trusted dashboard task using fixed labels and descriptions.

    Values are numeric aggregates or ``None``. Metadata is selected from
    constants in this module; callers cannot inject free-text task metadata.
    """
    if task_id not in _TASKS:
        raise ResultsValidationError("Unsupported evaluation task identifier.")
    spec = _TASKS[task_id]
    if not isinstance(values_by_system, dict) or set(values_by_system) - set(spec["systems"]):
        raise ResultsValidationError("Unsupported system identifier for task.")
    metrics = [
        {
            "key": key,
            "label": label,
            "higher_is_better": higher_is_better,
            "unit": unit,
            "description": description,
        }
        for key, (label, higher_is_better, unit, description) in spec["metrics"].items()
    ]
    systems = []
    for name, kind in spec["systems"].items():
        system_values = values_by_system.get(name, {})
        if not isinstance(system_values, dict) or set(system_values) - set(spec["metrics"]):
            raise ResultsValidationError("System values contain an unsupported metric.")
        values = {}
        for metric_key, (_label, _direction, unit, _description) in spec["metrics"].items():
            value = system_values.get(metric_key)
            if value is not None:
                if not _is_number(value):
                    raise ResultsValidationError("Metric values must be finite numbers or null.")
                if unit == "ratio" and not 0 <= value <= 1:
                    raise ResultsValidationError("Ratio metrics must be between zero and one.")
                if unit == "percent" and not 0 <= value <= 100:
                    raise ResultsValidationError("Percent metrics must be between zero and one hundred.")
                if unit in {"points", "seconds"} and value < 0:
                    raise ResultsValidationError("Point and time metrics cannot be negative.")
            values[metric_key] = value
        systems.append({"name": name, "kind": kind, "values": values})
    return {
        "id": task_id,
        "title": spec["title"],
        "description": spec["description"],
        "metrics": metrics,
        "systems": systems,
    }


def _validate_task(task):
    if not isinstance(task, dict) or set(task) != {"id", "title", "description", "metrics", "systems"}:
        raise ResultsValidationError("Tasks must use the approved public field set.")
    task_id = task.get("id")
    if task_id not in _TASKS:
        raise ResultsValidationError("Unsupported evaluation task identifier.")
    spec = _TASKS[task_id]
    if task.get("title") != spec["title"] or task.get("description") != spec["description"]:
        raise ResultsValidationError("Task metadata must use the approved fixed description.")
    canonical = build_task(task_id, {
        system.get("name"): system.get("values")
        for system in task["systems"]
        if isinstance(system, dict) and isinstance(system.get("name"), str)
    }) if isinstance(task.get("systems"), list) else None
    if canonical is None:
        raise ResultsValidationError("Task systems must be an array.")
    if task.get("metrics") != canonical["metrics"]:
        raise ResultsValidationError("Metric metadata must use the approved fixed definitions.")
    if task.get("systems") != canonical["systems"]:
        raise ResultsValidationError("System metadata must use the approved fixed identifiers and order.")
    return canonical


def validate_dashboard_results(results):
    """Validate the strict public projection consumed by ``normalizeResults``."""
    if not isinstance(results, dict) or set(results) - {"generated_at", "test_set", "tasks"}:
        raise ResultsValidationError("Dashboard results contain unsupported public fields.")
    tasks = results.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        raise ResultsValidationError("Dashboard results require at least one task.")
    if len({task.get("id") for task in tasks if isinstance(task, dict)}) != len(tasks):
        raise ResultsValidationError("Dashboard task identifiers must be unique.")
    for task in tasks:
        _validate_task(task)
    if "generated_at" in results:
        _validate_timestamp(results["generated_at"])
    test_set = results.get("test_set")
    if test_set is not None:
        if not isinstance(test_set, dict) or set(test_set) != {"description", "resumes", "pairs"}:
            raise ResultsValidationError("test_set must use the approved public field set.")
        if test_set["description"] not in {
            "Training set metrics; not a held-out evaluation.",
            "Development set metrics; may be used for model selection and tuning.",
            "Held-out test set: never used for training or tuning.",
        }:
            raise ResultsValidationError("test_set description must be a fixed split description.")
        for key in ("resumes", "pairs"):
            if test_set[key] is not None and not _is_count(test_set[key]):
                raise ResultsValidationError(f"test_set.{key} must be a non-negative integer or null.")
    return results


def _validate_timestamp(value):
    if not isinstance(value, str) or not value.strip():
        raise ResultsValidationError("generated_at must be a non-empty ISO date-time string.")
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise ResultsValidationError("generated_at must be an ISO date-time string.") from None


def _validate_evaluation_config(config, split):
    expected = {"mode", "adapters", "model_ids", "ranking_k", "relevance_threshold", "seed"}
    if not isinstance(config, dict) or set(config) != expected:
        raise ResultsValidationError("Evaluation configuration does not match the approved schema.")
    if config["mode"] not in _ALLOWED_MODES:
        raise ResultsValidationError("Unsupported evaluation mode.")
    if (split == "test") != (config["mode"] == "final"):
        raise ResultsValidationError("Final mode is reserved for the locked test split.")
    if not isinstance(config["adapters"], list) or any(adapter not in _ALLOWED_ADAPTERS for adapter in config["adapters"]):
        raise ResultsValidationError("Evaluation adapters contain an unsupported identifier.")
    if not isinstance(config["model_ids"], dict) or set(config["model_ids"]) - set(config["adapters"]):
        raise ResultsValidationError("Model identifiers must belong to configured adapters.")
    if any(not isinstance(model_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:/+-]{0,127}", model_id)
           for model_id in config["model_ids"].values()):
        raise ResultsValidationError("Model identifiers must be safe, non-empty version labels.")
    if config["ranking_k"] != 5 or config["relevance_threshold"] != 75:
        raise ResultsValidationError("Evaluation configuration must use k=5 and fit_score >= 75.")
    if config["seed"] is not None and type(config["seed"]) is not int:
        raise ResultsValidationError("Evaluation seed must be an integer or null.")


def create_results_artifact(*, split, resumes, pairs, tasks=None, evaluation_result=None,
                            generated_at=None, evaluation_config=None,
                            reproducibility=None, source_dataset=None):
    """Create a canonical result object containing aggregates and safe metadata."""
    if split not in {"train", "dev", "test"}:
        raise ResultsValidationError("split must be train, dev, or test.")
    if source_dataset is not None and getattr(source_dataset, "split", None) != split:
        raise ResultsValidationError("Result split does not match its loader-created dataset.")
    if evaluation_result is not None:
        if source_dataset is None or not isinstance(evaluation_result, EvaluationRun) \
                or not evaluation_result.matches(source_dataset):
            raise ResultsValidationError("Evaluation metrics provenance does not match the source dataset.")
        if evaluation_result.split != split:
            raise ResultsValidationError("Evaluation metrics provenance split does not match the artifact split.")
        if tasks is not None:
            raise ResultsValidationError("Pass either evaluation_result or raw tasks, not both.")
        tasks = evaluation_result.tasks
    if split == "test" and (
        source_dataset is None
        or not getattr(source_dataset, "verified_test_publication_source", False)
        or evaluation_result is None
    ):
        raise ResultsValidationError("Test artifacts require loader-created test data and runner-created metrics provenance.")
    if tasks is None:
        raise ResultsValidationError("Result tasks are required.")
    for name, value in (("resumes", resumes), ("pairs", pairs)):
        if value is not None and not _is_count(value):
            raise ResultsValidationError(f"{name} must be a non-negative integer or null.")
    timestamp = generated_at or datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    _validate_timestamp(timestamp)
    mode = "final" if split == "test" else "development"
    evaluation_config = evaluation_config or {
        "mode": mode,
        "adapters": ["keyword_parser", "skill_overlap_matcher", "keyword_evaluator"],
        "model_ids": {},
        "ranking_k": 5,
        "relevance_threshold": 75,
        "seed": 0,
    }
    _validate_evaluation_config(evaluation_config, split)
    reproducibility = reproducibility or {
        "runner_version": "1",
        "python_version": platform.python_version(),
        "cache_enabled": False,
    }
    if (not isinstance(reproducibility, dict)
            or set(reproducibility) != {"runner_version", "python_version", "cache_enabled"}
            or reproducibility["runner_version"] != "1"
            or not isinstance(reproducibility["python_version"], str)
            or not reproducibility["python_version"]
            or type(reproducibility["cache_enabled"]) is not bool):
        raise ResultsValidationError("Reproducibility metadata does not match the approved schema.")

    descriptions = {
        "train": "Training set metrics; not a held-out evaluation.",
        "dev": "Development set metrics; may be used for model selection and tuning.",
        "test": "Held-out test set: never used for training or tuning.",
    }
    canonical_tasks = [_validate_task(task) for task in tasks]
    canonical_tasks.sort(key=lambda task: ("parser", "matching", "evaluator").index(task["id"]))
    dataset_info = {"description": descriptions[split], "resumes": resumes, "pairs": pairs}
    if source_dataset is not None:
        if resumes != source_dataset.split_resume_count or pairs != len(source_dataset.pairs):
            raise ResultsValidationError("Artifact counts do not match the loaded dataset.")
        dataset_info["manifest_sha256"] = source_dataset.manifest_sha256
    artifact = {
        "schema_version": 1,
        "generated_at": timestamp,
        "split": split,
        "dataset": dataset_info,
        "evaluation_config": evaluation_config,
        "reproducibility": reproducibility,
        "tasks": canonical_tasks,
    }
    validate_canonical_artifact(artifact)
    return artifact


def validate_canonical_artifact(artifact):
    if not isinstance(artifact, dict) or set(artifact) != {
        "schema_version", "generated_at", "split", "dataset", "evaluation_config",
        "reproducibility", "tasks",
    } or artifact.get("schema_version") != 1:
        raise ResultsValidationError("Unsupported canonical result schema or fields.")
    split = artifact.get("split")
    if split not in {"train", "dev", "test"}:
        raise ResultsValidationError("Canonical results split must be train, dev, or test.")
    _validate_timestamp(artifact.get("generated_at"))
    dataset = artifact.get("dataset")
    expected_description = {
        "train": "Training set metrics; not a held-out evaluation.",
        "dev": "Development set metrics; may be used for model selection and tuning.",
        "test": "Held-out test set: never used for training or tuning.",
    }[split]
    if (not isinstance(dataset, dict) or set(dataset) not in (
            {"description", "resumes", "pairs"}, {"description", "resumes", "pairs", "manifest_sha256"})
            or dataset.get("description") != expected_description):
        raise ResultsValidationError("Dataset provenance does not match the fixed split schema.")
    if "manifest_sha256" in dataset and (not isinstance(dataset["manifest_sha256"], str)
            or len(dataset["manifest_sha256"]) != 64
            or any(char not in "0123456789abcdef" for char in dataset["manifest_sha256"])):
        raise ResultsValidationError("Dataset manifest digest is invalid.")
    if split == "test" and "manifest_sha256" not in dataset:
        raise ResultsValidationError("Test artifact must include verified split manifest provenance.")
    for key in ("resumes", "pairs"):
        if dataset[key] is not None and not _is_count(dataset[key]):
            raise ResultsValidationError(f"dataset.{key} must be a non-negative integer or null.")
    _validate_evaluation_config(artifact.get("evaluation_config"), split)
    repro = artifact.get("reproducibility")
    if (not isinstance(repro, dict) or set(repro) != {"runner_version", "python_version", "cache_enabled"}
            or repro.get("runner_version") != "1" or not isinstance(repro.get("python_version"), str)
            or type(repro.get("cache_enabled")) is not bool):
        raise ResultsValidationError("Reproducibility metadata is invalid.")
    tasks = artifact.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        raise ResultsValidationError("Canonical results require at least one task.")
    canonical_tasks = [_validate_task(task) for task in tasks]
    if canonical_tasks != tasks:
        raise ResultsValidationError("Canonical tasks are not in deterministic order or shape.")
    return artifact


def _verify_test_source(artifact, source_dataset, evaluation_result):
    if artifact.get("split") != "test":
        raise ResultsValidationError("Only locked test artifacts can be published to the dashboard.")
    if source_dataset is None or getattr(source_dataset, "verified_test_publication_source", False) is not True:
        raise ResultsValidationError("Test publication requires an explicitly opted-in loader-created dataset.")
    if (not isinstance(evaluation_result, EvaluationRun)
            or not evaluation_result.matches(source_dataset)):
        raise ResultsValidationError("Dashboard publication requires metrics evaluated on this exact test dataset.")
    if evaluation_result.split != "test":
        raise ResultsValidationError("Dashboard metrics provenance must identify the test split.")
    dataset = artifact.get("dataset", {})
    if (getattr(source_dataset, "split", None) != "test"
            or dataset.get("manifest_sha256") != getattr(source_dataset, "manifest_sha256", None)):
        raise ResultsValidationError("Artifact manifest does not match the verified test dataset.")
    if dataset.get("resumes") != getattr(source_dataset, "split_resume_count", None):
        raise ResultsValidationError("Artifact resume count does not match the verified test dataset.")
    if dataset.get("pairs") != len(getattr(source_dataset, "pairs", ())):
        raise ResultsValidationError("Artifact pair count does not match the verified test dataset.")
    if getattr(source_dataset, "manifest_sha256", None) is None:
        raise ResultsValidationError("Verified test dataset is missing its manifest digest.")
    if artifact.get("tasks") != evaluation_result.tasks:
        raise ResultsValidationError("Artifact task metrics do not match the verified evaluation run.")


def dashboard_projection(artifact, *, source_dataset=None, evaluation_result=None):
    """Create the public dashboard view; requires verified test provenance."""
    validate_canonical_artifact(artifact)
    _verify_test_source(artifact, source_dataset, evaluation_result)
    projection = {
        "generated_at": artifact["generated_at"],
        "test_set": {
            "description": artifact["dataset"]["description"],
            "resumes": artifact["dataset"]["resumes"],
            "pairs": artifact["dataset"]["pairs"],
        },
        "tasks": artifact["tasks"],
    }
    validate_dashboard_results(projection)
    return projection


def _stage_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False, sort_keys=True)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
    except Exception:
        try:
            os.unlink(temporary_name)
        except FileNotFoundError:
            pass
        raise
    return path, Path(temporary_name)


def write_results(artifact, results_path, dashboard_path=None, *, source_dataset=None,
                  evaluation_result=None):
    """Atomically write canonical aggregates and, when authorized, dashboard JSON.

    Each file replacement is atomic. Two distinct filesystem paths cannot be
    committed as a single transaction. Output paths must be different.
    """
    validate_canonical_artifact(artifact)
    canonical_path = Path(results_path).resolve()
    outputs = [(canonical_path, artifact)]
    if dashboard_path is not None:
        public_path = Path(dashboard_path).resolve()
        if public_path == canonical_path:
            raise ResultsValidationError("Canonical and dashboard output paths must differ.")
        outputs.append((public_path, dashboard_projection(
            artifact, source_dataset=source_dataset, evaluation_result=evaluation_result
        )))

    staged = []
    try:
        for destination, value in outputs:
            staged.append(_stage_json(destination, value))
        for destination, temporary in staged:
            os.replace(temporary, destination)
    finally:
        for _, temporary in staged:
            try:
                temporary.unlink()
            except FileNotFoundError:
                pass
    return tuple(destination for destination, _ in outputs)
