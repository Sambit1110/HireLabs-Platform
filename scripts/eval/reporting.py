"""Deterministic aggregate-only comparison, chart and error reports."""

import json
import os
from pathlib import Path
import tempfile

from .config import ENTITY_LABELS
from .results_writer import validate_canonical_artifact

_SYSTEM_ADAPTER_KEYS = {
    "parser": {"Gemini": "gemini_parser", "hirelabs-parser": "spacy_parser"},
    "matching": {"Gemini embeddings": "gemini_embeddings", "hirelabs-matcher": "hirelabs_matcher"},
    "evaluator": {"Gemini": "gemini_evaluator", "hirelabs-evaluator": "hirelabs_evaluator"},
}


def report_data(artifact, error_analysis=None):
    validate_canonical_artifact(artifact)
    charts, errors = [], []
    for task in artifact["tasks"]:
        chart_metrics = []
        for metric in task["metrics"]:
            points = [{"system": system["name"], "kind": system["kind"],
                       "availability": _availability(artifact, task["id"], system),
                       "value": system["values"][metric["key"]]} for system in task["systems"]]
            chart_metrics.append({"key": metric["key"], "label": metric["label"], "unit": metric["unit"], "systems": points})
        charts.append({"task": task["id"], "title": task["title"], "metrics": chart_metrics})
    if error_analysis is None:
        error_analysis = {}
    if not isinstance(error_analysis, dict) or set(error_analysis) - {"parser", "matching", "evaluator"}:
        raise ValueError("Error analysis must contain only known task aggregates.")
    for task_id in ("parser", "matching", "evaluator"):
        if task_id in error_analysis:
            errors.append({"task": task_id, "system": "Keyword baseline",
                           **_validate_error_task(task_id, error_analysis[task_id])})
        elif any(task["id"] == task_id for task in artifact["tasks"]):
            errors.append({"task": task_id, "system": "Keyword baseline",
                           "status": "No error analysis supplied."})
    return charts, errors


def _availability(artifact, task_id, system):
    if system["kind"] == "baseline":
        return "baseline"
    adapter_key = _SYSTEM_ADAPTER_KEYS.get(task_id, {}).get(system["name"])
    return "adapter-enabled" if adapter_key in artifact["evaluation_config"]["adapters"] else "unavailable"


def _count(value):
    return type(value) is int and value >= 0


def _validate_error_task(task_id, value):
    if not isinstance(value, dict):
        raise ValueError("Error analysis task data must be an aggregate object.")
    if task_id == "parser":
        key = "false_positives_and_negatives_by_label"
        if set(value) != {key} or set(value[key]) != set(ENTITY_LABELS):
            raise ValueError("Parser error analysis must contain fixed per-label counts.")
        for counts in value[key].values():
            if set(counts) != {"false_positives", "false_negatives"} or not all(_count(item) for item in counts.values()):
                raise ValueError("Parser error analysis values must be non-negative counts.")
    elif task_id == "matching":
        if set(value) != {"eligible_queries", "missed_relevant_candidates"} or not all(_count(item) for item in value.values()):
            raise ValueError("Matching error analysis values must be non-negative counts.")
    elif task_id == "evaluator":
        bands = value.get("absolute_score_error_bands") if isinstance(value, dict) else None
        if (set(value) != {"verdict_errors", "scored_pairs", "absolute_score_error_bands"}
                or not _count(value.get("verdict_errors")) or not _count(value.get("scored_pairs"))
                or not isinstance(bands, dict)
                or set(bands) != {"0_to_10", "over_10_to_25", "over_25"}
                or not all(_count(item) for item in bands.values())):
            raise ValueError("Evaluator error analysis values must use fixed non-negative aggregates.")
    return value


def write_reports(artifact, markdown_path, chart_path, error_path, *, error_analysis=None,
                  evaluation_section_path=None):
    validate_canonical_artifact(artifact)
    charts, errors = report_data(artifact, error_analysis)
    lines = ["# Evaluation comparison", "", f"Split: **{artifact['split']}**", "", "| Task | Metric | System | Result type | Availability | Value |", "|---|---|---|---|---|---:|"]
    for task in artifact["tasks"]:
        for metric in task["metrics"]:
            for system in task["systems"]:
                value = system["values"][metric["key"]]
                status = _availability(artifact, task["id"], system)
                lines.append(f"| {task['title']} | {metric['label']} | {system['name']} | {system['kind']} | {status} | {value if value is not None else 'null'} |")
    lines += ["", "Missing measurements are represented as `null`. No per-person text, IDs, or predictions are included."]
    _atomic_text(markdown_path, "\n".join(lines) + "\n")
    _atomic_text(chart_path, json.dumps(charts, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    _atomic_text(error_path, json.dumps(errors, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    if evaluation_section_path is not None:
        _atomic_text(evaluation_section_path, _evaluation_section(artifact))


def _evaluation_section(artifact):
    lines = [
        "# Evaluation results", "",
        f"Evaluation split: **{artifact['split']}** ({artifact['dataset']['resumes']} resumes; {artifact['dataset']['pairs']} labeled pairs).",
        "", "The keyword baseline is measured. Gemini and HireLabs rows are shown only when an explicit adapter supplies predictions; unavailable measurements remain `null`.",
        "", "## Systems", "",
        "| Task | System | Type | Availability |", "|---|---|---|---|",
    ]
    for task in artifact["tasks"]:
        for system in task["systems"]:
            lines.append(f"| {task['title']} | {system['name']} | {system['kind']} | {_availability(artifact, task['id'], system)} |")
    lines.extend(["", "`unavailable` means no adapter was provided or activated; its values remain `null`. `adapter-enabled` identifies an explicitly supplied adapter, while null metrics may still reflect empty denominators.", "", "## Metrics", ""])
    for task in artifact["tasks"]:
        lines.extend([f"### {task['title']}", ""])
        for metric in task["metrics"]:
            lines.append(f"- **{metric['label']}**: {metric['description']}")
        lines.append("")
    lines.extend([
        "Parser scores require exact character spans against the original annotated text. Matching Recall@5, MRR, and success@5 use explicit judgments; unjudged candidates are excluded. Evaluator metrics use human or human-checked labels. Error reports contain aggregate counts only.",
        "",
    ])
    return "\n".join(lines)


def _atomic_text(path, content):
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=f".{destination.name}.", suffix=".tmp", dir=destination.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, destination)
    finally:
        try:
            os.unlink(name)
        except FileNotFoundError:
            pass
