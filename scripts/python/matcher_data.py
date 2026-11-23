"""Validation helpers for the reviewed HireLabs matcher dataset."""

import hashlib
import json
import os
import re
from typing import Any, Dict, List, Tuple


REQUIRED_FIELDS = {
    "pair_id",
    "resume_id",
    "jd_id",
    "fit_score",
    "fit_verdict",
    "label_source",
}
APPROVED_LABEL_SOURCES = {"human", "gemini_checked"}
VERDICT_BANDS = {
    "strong": (75, 100),
    "moderate": (50, 74),
    "weak": (0, 49),
    # The shared plan does not define a score rule for this verdict. Keep it
    # recognized, but fail closed until the data lead specifies that rule.
    "insufficient_evidence": None,
}


class DatasetValidationError(ValueError):
    """Raised when reviewed data cannot safely be used for training/evaluation."""


def _load_jsonl(path: str) -> Tuple[List[Dict[str, Any]], str]:
    if not os.path.isfile(path):
        raise DatasetValidationError(f"Required file does not exist: {path}")
    if os.path.getsize(path) == 0:
        raise DatasetValidationError(f"Required file is empty: {path}")

    rows: List[Dict[str, Any]] = []
    with open(path, "rb") as source:
        raw = source.read()
    checksum = hashlib.sha256(raw).hexdigest()

    for line_number, raw_line in enumerate(raw.splitlines(), start=1):
        if not raw_line.strip():
            raise DatasetValidationError(f"{path}:{line_number}: blank lines are not allowed")
        try:
            row = json.loads(raw_line.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise DatasetValidationError(f"{path}:{line_number}: invalid UTF-8 JSON: {error}") from error
        if not isinstance(row, dict):
            raise DatasetValidationError(f"{path}:{line_number}: each JSON value must be an object")
        missing = REQUIRED_FIELDS - row.keys()
        if missing:
            raise DatasetValidationError(
                f"{path}:{line_number}: missing required fields: {', '.join(sorted(missing))}"
            )
        rows.append(row)

    return rows, checksum


def _validate_rows(rows: List[Dict[str, Any]], path: str) -> None:
    seen_ids = set()
    seen_pairs = set()
    for line_number, row in enumerate(rows, start=1):
        for field in ("pair_id", "resume_id", "jd_id"):
            if not isinstance(row[field], str) or not row[field].strip():
                raise DatasetValidationError(f"{path}:{line_number}: {field} must be a non-empty string")
            if not re.fullmatch(r"[A-Za-z0-9_-]+", row[field]):
                raise DatasetValidationError(
                    f"{path}:{line_number}: {field} contains unsupported characters: {row[field]!r}"
                )

        pair_id = row["pair_id"]
        if pair_id in seen_ids:
            raise DatasetValidationError(f"{path}:{line_number}: duplicate pair_id {pair_id!r}")
        seen_ids.add(pair_id)

        pair_key = (row["resume_id"], row["jd_id"])
        if pair_key in seen_pairs:
            raise DatasetValidationError(
                f"{path}:{line_number}: duplicate resume/job pair {pair_key!r}"
            )
        seen_pairs.add(pair_key)

        score = row["fit_score"]
        if isinstance(score, bool) or not isinstance(score, int) or not 0 <= score <= 100:
            raise DatasetValidationError(f"{path}:{line_number}: fit_score must be an integer from 0 to 100")

        verdict = row["fit_verdict"]
        if not isinstance(verdict, str) or verdict not in VERDICT_BANDS:
            raise DatasetValidationError(f"{path}:{line_number}: unsupported fit_verdict {verdict!r}")
        band = VERDICT_BANDS[verdict]
        if verdict == "insufficient_evidence":
            raise DatasetValidationError(
                f"{path}:{line_number}: score rules for insufficient_evidence are not defined in the shared schema"
            )
        if band and not band[0] <= score <= band[1]:
            raise DatasetValidationError(
                f"{path}:{line_number}: fit_score {score} conflicts with fit_verdict {verdict!r}"
            )

        source = row["label_source"]
        if not isinstance(source, str) or source not in APPROVED_LABEL_SOURCES:
            raise DatasetValidationError(
                f"{path}:{line_number}: label_source {source!r} is not an approved human-reviewed source"
            )


def validate_dataset(data_dir: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
    """Validate both splits and referenced raw text; return rows and reproducibility metadata."""
    pairs_dir = os.path.join(data_dir, "pairs")
    train_path = os.path.join(pairs_dir, "train.jsonl")
    dev_path = os.path.join(pairs_dir, "dev.jsonl")

    train_rows, train_hash = _load_jsonl(train_path)
    dev_rows, dev_hash = _load_jsonl(dev_path)
    _validate_rows(train_rows, train_path)
    _validate_rows(dev_rows, dev_path)

    train_ids = {row["pair_id"] for row in train_rows}
    dev_ids = {row["pair_id"] for row in dev_rows}
    overlap_ids = train_ids & dev_ids
    if overlap_ids:
        raise DatasetValidationError(
            f"train/dev pair_id overlap ({len(overlap_ids)}): {', '.join(sorted(overlap_ids)[:10])}"
        )

    train_pairs = {(row["resume_id"], row["jd_id"]) for row in train_rows}
    dev_pairs = {(row["resume_id"], row["jd_id"]) for row in dev_rows}
    overlap_pairs = train_pairs & dev_pairs
    if overlap_pairs:
        examples = sorted(overlap_pairs)[:5]
        raise DatasetValidationError(f"train/dev resume/job pair overlap ({len(overlap_pairs)}): {examples!r}")
    if not any(row["fit_verdict"] == "strong" for row in dev_rows):
        raise DatasetValidationError("dev split has no strong-fit pairs, so Recall@5 and MRR cannot be measured")

    raw_paths = {
        "resumes": os.path.join(data_dir, "raw", "resumes"),
        "jds": os.path.join(data_dir, "raw", "jds"),
    }
    raw_file_hashes: Dict[str, str] = {}
    for row in train_rows + dev_rows:
        for kind, identifier in (("resumes", row["resume_id"]), ("jds", row["jd_id"])):
            text_path = os.path.join(raw_paths[kind], f"{identifier}.txt")
            if not os.path.isfile(text_path) or os.path.getsize(text_path) == 0:
                raise DatasetValidationError(f"Missing or empty raw {kind[:-1]} text for {identifier!r}: {text_path}")
            relative_path = f"raw/{kind}/{identifier}.txt"
            if relative_path not in raw_file_hashes:
                with open(text_path, "rb") as text_file:
                    raw_file_hashes[relative_path] = hashlib.sha256(text_file.read()).hexdigest()

    metadata = {
        # Folder name only: a full path would leak the local user name into shared artifacts.
        "data_dir": os.path.basename(os.path.abspath(data_dir)),
        "files": {
            "pairs/train.jsonl": {"rows": len(train_rows), "sha256": train_hash},
            "pairs/dev.jsonl": {"rows": len(dev_rows), "sha256": dev_hash},
        },
        "raw_text_files": dict(sorted(raw_file_hashes.items())),
        "approved_label_sources": sorted(APPROVED_LABEL_SOURCES),
    }
    return train_rows, dev_rows, metadata


def load_texts(raw_dir: str) -> Dict[str, str]:
    """Load UTF-8 text files and fail if any file is empty or unreadable."""
    if not os.path.isdir(raw_dir):
        raise DatasetValidationError(f"Required raw text directory does not exist: {raw_dir}")
    texts: Dict[str, str] = {}
    for fname in sorted(os.listdir(raw_dir)):
        if fname.endswith(".txt"):
            doc_id = os.path.splitext(fname)[0]
            with open(os.path.join(raw_dir, fname), "r", encoding="utf-8") as source:
                texts[doc_id] = source.read().strip()
            if not texts[doc_id]:
                raise DatasetValidationError(f"Raw text file is empty: {os.path.join(raw_dir, fname)}")
    return texts
