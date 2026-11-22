"""Explicit model adapter contracts; no model is activated implicitly."""

from dataclasses import dataclass
from typing import Any, Callable, Mapping, Protocol


class Adapter(Protocol):
    """Common injectable contract. Adapters must be side-effect free until used."""
    name: str
    model_id: str
    def predict(self, inputs: Any) -> Any: ...


class ParserAdapter(Adapter, Protocol):
    """Input: {document_id, text}; output: span mappings in original-text offsets."""


class MatcherAdapter(Adapter, Protocol):
    """Input: {query_id, job_description, candidates}; output: ranked candidate IDs."""


class EvaluatorAdapter(Adapter, Protocol):
    """Input: {pair_id, resume_text, job_description}; return raw evaluator JSON text.

    A parsed object can still be scored for schema-valid verdict/score metrics,
    but cannot contribute to strict valid-JSON percentage.
    """


@dataclass(frozen=True)
class AdapterStatus:
    name: str
    available: bool
    reason: str


class UnavailableAdapter:
    def __init__(self, name: str, reason: str):
        self.name, self.reason = name, reason

    def status(self) -> AdapterStatus:
        return AdapterStatus(self.name, False, self.reason)

    def predict(self, _inputs):
        raise RuntimeError(f"Adapter {self.name} unavailable: {self.reason}")


class CallableAdapter:
    """Injectable adapter used by integrations and isolated mock tests."""
    def __init__(self, name: str, predict: Callable[[Any], Any], *, model_id=None):
        if not callable(predict):
            raise TypeError("predict must be callable")
        self.name, self.model_id, self._predict = name, model_id or name, predict

    def status(self) -> AdapterStatus:
        return AdapterStatus(self.name, True, "Injected prediction function.")

    def predict(self, inputs):
        return self._predict(inputs)


def unavailable_model_adapters() -> Mapping[str, UnavailableAdapter]:
    return {
        "spacy_parser": UnavailableAdapter("spacy_parser", "No configured exact-span parser model adapter is present."),
        "gemini_parser": UnavailableAdapter("gemini_parser", "The current parser integration returns profile fields, not exact character spans."),
        "hirelabs_matcher": UnavailableAdapter("hirelabs_matcher", "Matcher service identity cannot be guaranteed without activating its local service."),
        "gemini_embeddings": UnavailableAdapter("gemini_embeddings", "No Gemini embedding integration exists in this repository."),
        "gemini_evaluator": UnavailableAdapter("gemini_evaluator", "The current endpoint contract lacks the agreed fit_score and is not available offline."),
        "hirelabs_evaluator": UnavailableAdapter("hirelabs_evaluator", "No evaluator model request/response adapter contract is present."),
    }
