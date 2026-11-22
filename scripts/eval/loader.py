"""Strict JSONL loaders for the shared parser and resume-job schemas."""

from dataclasses import dataclass, field
import hashlib
from pathlib import Path

from .config import ENTITY_LABELS, FIT_VERDICTS, LABEL_SOURCES, SPLIT_FILES
from .strict_json import StrictJSONError, loads_strict


class DatasetValidationError(ValueError):
    """A dataset row is invalid; messages intentionally omit source text."""


_LOADER_PROVENANCE = object()


@dataclass(frozen=True, init=False)
class EvaluationDataset:
    """Loaded split object with application-level loader provenance.

    This guard prevents accidental construction by ordinary callers. It is
    not cryptographic protection against code running in the same process.
    """

    split: str
    parser_rows: tuple
    pairs: tuple
    resumes: dict
    jobs: dict
    data_root: str
    manifest_sha256: str
    manifest_verified: bool
    test_opt_in: bool
    split_resume_count: int
    _provenance: object = field(repr=False, compare=False)

    def __init__(self, **_kwargs):
        raise TypeError("EvaluationDataset objects must be created by load_dataset().")

    @classmethod
    def _from_loader(cls, *, _token, **values):
        if _token is not _LOADER_PROVENANCE:
            raise TypeError("Invalid dataset loader provenance.")
        instance = object.__new__(cls)
        for key, value in values.items():
            object.__setattr__(instance, key, value)
        object.__setattr__(instance, "_provenance", _LOADER_PROVENANCE)
        return instance

    @property
    def verified_test_publication_source(self):
        return (
            self._provenance is _LOADER_PROVENANCE
            and self.split == "test"
            and self.manifest_verified is True
            and self.test_opt_in is True
        )


def _read_jsonl(path):
    if not path.is_file():
        raise DatasetValidationError(f"Missing required dataset file: {path}")
    rows = []
    try:
        with path.open("r", encoding="utf-8") as stream:
            for line_number, line in enumerate(stream, start=1):
                if not line.strip():
                    raise DatasetValidationError(
                        f"Empty JSONL row in {path} at line {line_number}."
                    )
                try:
                    value = loads_strict(line)
                except (StrictJSONError, UnicodeDecodeError):
                    raise DatasetValidationError(
                        f"Invalid JSON in {path} at line {line_number}."
                    ) from None
                if not isinstance(value, dict):
                    raise DatasetValidationError(
                        f"Expected a JSON object in {path} at line {line_number}."
                    )
                rows.append((line_number, value))
    except UnicodeDecodeError:
        raise DatasetValidationError(f"Dataset file is not valid UTF-8: {path}") from None
    if not rows:
        raise DatasetValidationError(f"Required JSONL file contains no records: {path}")
    return rows


def _required_string(row, key, path, line_number):
    value = row.get(key)
    if not isinstance(value, str) or not value.strip():
        raise DatasetValidationError(
            f"{path} line {line_number}: '{key}' must be a non-empty string."
        )
    return value


def _read_text_directory(path, description):
    if not path.is_dir():
        raise DatasetValidationError(f"Missing {description} directory: {path}")
    documents = {}
    normalized_ids = set()
    for entry in sorted(path.iterdir(), key=lambda item: item.name):
        if entry.is_symlink() or not entry.is_file() or entry.suffix.casefold() != ".txt":
            raise DatasetValidationError(f"Unexpected file in {description} directory: {entry}")
        file_path = entry
        document_id = file_path.stem
        key = document_id.casefold()
        if key in normalized_ids:
            raise DatasetValidationError(f"Duplicate {description} identifier in {path}.")
        normalized_ids.add(key)
        try:
            documents[document_id] = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            raise DatasetValidationError(f"Invalid UTF-8 in {file_path}.") from None
    return documents


def _read_split_manifest(path):
    if not path.is_file():
        raise DatasetValidationError(f"Missing frozen split manifest: {path}")
    try:
        manifest = loads_strict(path.read_text(encoding="utf-8"))
    except (StrictJSONError, UnicodeDecodeError):
        raise DatasetValidationError(f"Invalid frozen split manifest: {path}") from None
    if not isinstance(manifest, dict) or any(
        not isinstance(document_id, str) or not document_id.strip()
        or split not in {"train", "dev", "test"}
        for document_id, split in manifest.items()
    ):
        raise DatasetValidationError(f"Invalid frozen split manifest: {path}")
    normalized_ids = [document_id.casefold() for document_id in manifest]
    if len(normalized_ids) != len(set(normalized_ids)):
        raise DatasetValidationError(f"Duplicate resume identifiers in frozen split manifest: {path}")
    return manifest


def _validate_parser_rows(path):
    rows = []
    seen_ids = set()
    for line_number, row in _read_jsonl(path):
        document_id = _required_string(row, "id", path, line_number)
        text = row.get("text")
        entities = row.get("entities")
        if not isinstance(text, str):
            raise DatasetValidationError(f"{path} line {line_number}: 'text' must be a string.")
        if not isinstance(entities, list):
            raise DatasetValidationError(f"{path} line {line_number}: 'entities' must be an array.")
        if document_id in seen_ids:
            raise DatasetValidationError(f"{path} line {line_number}: duplicate parser identifier.")
        seen_ids.add(document_id)

        normalized_entities = []
        for entity in entities:
            if not isinstance(entity, dict):
                raise DatasetValidationError(f"{path} line {line_number}: entity must be an object.")
            start, end, label = entity.get("start"), entity.get("end"), entity.get("label")
            if (not isinstance(start, int) or isinstance(start, bool)
                    or not isinstance(end, int) or isinstance(end, bool)):
                raise DatasetValidationError(f"{path} line {line_number}: span offsets must be integers.")
            if not 0 <= start < end <= len(text):
                raise DatasetValidationError(f"{path} line {line_number}: span offsets are out of bounds.")
            if label not in ENTITY_LABELS:
                raise DatasetValidationError(f"{path} line {line_number}: unsupported entity label.")
            normalized_entities.append({"start": start, "end": end, "label": label})

        normalized_entities.sort(key=lambda item: (item["start"], item["end"], item["label"]))
        if any(left["end"] > right["start"] for left, right in zip(normalized_entities, normalized_entities[1:])):
            raise DatasetValidationError(f"{path} line {line_number}: entity spans overlap.")
        rows.append({"id": document_id, "text": text, "entities": normalized_entities})
    return rows


def _validate_pair_rows(path, split, resume_ids, job_ids, manifest):
    rows = []
    seen_pair_ids = set()
    seen_pairs = set()
    for line_number, row in _read_jsonl(path):
        pair_id = _required_string(row, "pair_id", path, line_number)
        resume_id = _required_string(row, "resume_id", path, line_number)
        jd_id = _required_string(row, "jd_id", path, line_number)
        score = row.get("fit_score")
        verdict = row.get("fit_verdict")
        source = row.get("label_source")

        if not isinstance(score, int) or isinstance(score, bool) or not 0 <= score <= 100:
            raise DatasetValidationError(f"{path} line {line_number}: 'fit_score' must be an integer from 0 to 100.")
        expected_verdict = "strong" if score >= 75 else "moderate" if score >= 50 else "weak"
        if verdict not in FIT_VERDICTS or (verdict != "insufficient_evidence" and verdict != expected_verdict):
            raise DatasetValidationError(f"{path} line {line_number}: score and verdict disagree.")
        if source not in LABEL_SOURCES or (split == "test" and source == "category"):
            raise DatasetValidationError(f"{path} line {line_number}: invalid label source for split.")
        if resume_id not in resume_ids:
            raise DatasetValidationError(f"{path} line {line_number}: unknown resume reference.")
        if manifest.get(resume_id) != split:
            raise DatasetValidationError(f"{path} line {line_number}: resume belongs to a different split.")
        if jd_id not in job_ids:
            raise DatasetValidationError(f"{path} line {line_number}: unknown job reference.")
        if pair_id in seen_pair_ids or (resume_id, jd_id) in seen_pairs:
            raise DatasetValidationError(f"{path} line {line_number}: duplicate pair identifier or pair.")
        seen_pair_ids.add(pair_id)
        seen_pairs.add((resume_id, jd_id))
        rows.append({
            "pair_id": pair_id,
            "resume_id": resume_id,
            "jd_id": jd_id,
            "fit_score": score,
            "fit_verdict": verdict,
            "label_source": source,
        })
    return rows


def load_dataset(data_root, split="dev", *, allow_test=False):
    """Load one explicit split directory, with a second explicit test opt-in.

    ``data_root`` is required and is never discovered automatically. For the
    locked split, callers must also pass ``allow_test=True``. Only the
    authorized operator should make that call. Test layout follows the
    preparation scripts: test resumes under ``test/raw/resumes`` and shared
    job text under ``raw/jds``.
    """
    if split not in SPLIT_FILES:
        raise DatasetValidationError("Split must be train, dev, or test.")
    if data_root is None:
        raise DatasetValidationError("An explicit dataset root path is required.")
    root = Path(data_root).expanduser().resolve()
    if split == "test" and allow_test is not True:
        raise DatasetValidationError("Locked test loading requires explicit allow_test=True opt-in.")

    parser_rel, pairs_rel = SPLIT_FILES[split]
    parser_path, pairs_path = root / parser_rel, root / pairs_rel
    parser_rows = _validate_parser_rows(parser_path)
    manifest = _read_split_manifest(root / "splits.json")

    resume_dir = root / "test/raw/resumes" if split == "test" else root / "raw/resumes"
    resumes = _read_text_directory(resume_dir, "resume")
    jobs = _read_text_directory(root / "raw/jds", "job description")
    expected_splits = {"test"} if split == "test" else {"train", "dev"}
    expected_resume_ids = {
        document_id for document_id, assigned_split in manifest.items()
        if assigned_split in expected_splits
    }
    if set(resumes) != expected_resume_ids:
        raise DatasetValidationError(
            f"Resume files in {resume_dir} do not match the frozen {split} layout manifest."
        )
    parser_ids = {row["id"] for row in parser_rows}
    for row in parser_rows:
        if manifest.get(row["id"]) != split:
            raise DatasetValidationError(f"{parser_path}: parser row belongs to a different split.")
        if row["id"] in resumes and resumes[row["id"]] != row["text"]:
            raise DatasetValidationError(f"{parser_path}: parser text does not match raw resume file.")
    if not parser_ids.issubset(resumes):
        raise DatasetValidationError(f"{parser_path}: parser row references a missing raw resume.")

    pairs = _validate_pair_rows(pairs_path, split, resumes, jobs, manifest)
    manifest_bytes = (root / "splits.json").read_bytes()
    manifest_sha256 = hashlib.sha256(manifest_bytes).hexdigest()
    return EvaluationDataset._from_loader(
        _token=_LOADER_PROVENANCE,
        split=split,
        parser_rows=tuple(parser_rows),
        pairs=tuple(pairs),
        resumes=resumes,
        jobs=jobs,
        data_root=str(root),
        manifest_sha256=manifest_sha256,
        manifest_verified=True,
        test_opt_in=split == "test" and allow_test is True,
        split_resume_count=sum(1 for assigned_split in manifest.values() if assigned_split == split),
    )
