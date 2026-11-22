"""Immutable in-process provenance types for runner-produced metric results.

These types deliberately expose no factory accepting caller-supplied metrics.
Only ``evaluate_dataset`` creates instances as it completes its metric work.
This prevents supported API callers from relabeling arbitrary aggregates.
Python introspection and arbitrary code execution remain outside this guard.
"""

import json
from dataclasses import dataclass, field

from .loader import EvaluationDataset, _LOADER_PROVENANCE


def _is_loader_dataset(dataset):
    return (
        isinstance(dataset, EvaluationDataset)
        and getattr(dataset, "_provenance", None) is _LOADER_PROVENANCE
        and dataset.split in {"train", "dev", "test"}
        and isinstance(dataset.manifest_sha256, str)
        and len(dataset.manifest_sha256) == 64
    )


@dataclass(frozen=True, init=False)
class EvaluationTaskResult:
    """A read-only task aggregate bound to one dataset and one run."""

    split: str
    manifest_sha256: str
    _payload: str = field(repr=False, compare=False)
    _dataset: EvaluationDataset = field(repr=False, compare=False)
    _execution_id: object = field(repr=False, compare=False)

    def __init__(self, **_kwargs):
        raise TypeError("EvaluationTaskResult instances are created only by evaluate_dataset().")

    @property
    def task(self):
        """Return a detached copy so callers cannot mutate trusted aggregates."""
        return json.loads(self._payload)


@dataclass(frozen=True, init=False)
class EvaluationRun:
    """Immutable aggregate result tied to all task results from one execution."""

    split: str
    manifest_sha256: str
    task_results: tuple
    _dataset: EvaluationDataset = field(repr=False, compare=False)
    _execution_id: object = field(repr=False, compare=False)

    def __init__(self, **_kwargs):
        raise TypeError("EvaluationRun instances are created only by evaluate_dataset().")

    @property
    def tasks(self):
        return [result.task for result in self.task_results]

    def matches(self, dataset):
        if not _is_loader_dataset(dataset):
            return False
        if (self._dataset is not dataset or self.split != dataset.split
                or self.manifest_sha256 != dataset.manifest_sha256
                or not self.task_results):
            return False
        for result in self.task_results:
            if (not isinstance(result, EvaluationTaskResult)
                    or result._dataset is not dataset
                    or result.split != self.split
                    or result.manifest_sha256 != self.manifest_sha256
                    or result._execution_id is not self._execution_id):
                return False
        return True
