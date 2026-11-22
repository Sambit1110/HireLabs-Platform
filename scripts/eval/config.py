"""Shared evaluation labels and split layout.

Parser span scoring uses the original annotated text character-for-character after JSON
decoding. Do not clean annotated text before comparing character offsets.
"""

ENTITY_LABELS = (
    "NAME",
    "TITLE",
    "SKILL",
    "YEARS_EXPERIENCE",
    "DEGREE",
    "COMPANY",
)

FIT_VERDICTS = ("strong", "moderate", "weak", "insufficient_evidence")
LABEL_SOURCES = ("human", "gemini_checked", "category")
RELEVANCE_THRESHOLD = 75
DEFAULT_RANKING_K = 5

SPLIT_FILES = {
    "train": ("parser/train.jsonl", "pairs/train.jsonl"),
    "dev": ("parser/dev.jsonl", "pairs/dev.jsonl"),
    "test": ("test/parser_test.jsonl", "test/pairs_test.jsonl"),
}


class ModelUnavailableError(RuntimeError):
    """A requested evaluation adapter/model is not available."""


def require_models_available(required_models, available_models):
    """Fail clearly instead of silently substituting another model."""
    missing = sorted(set(required_models) - set(available_models))
    if missing:
        raise ModelUnavailableError(
            "Required evaluation model(s) unavailable: " + ", ".join(missing)
        )
