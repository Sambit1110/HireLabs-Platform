"""Convert reviewed pair rows to judgments and score supplied rankings."""

from .config import RELEVANCE_THRESHOLD
from .metrics import matching_metrics


def judgments_from_pairs(pairs, *, include_gemini_checked=True, threshold=RELEVANCE_THRESHOLD):
    """Return per-job relevant IDs and the explicitly human-judged universe.

    Category-derived labels are excluded. A missing pair is unjudged and is
    not added to the candidate universe.
    """
    relevant, judged = {}, {}
    accepted_sources = {"human"}
    if include_gemini_checked:
        accepted_sources.add("gemini_checked")
    for pair in pairs:
        if pair.get("label_source") not in accepted_sources:
            continue
        job_id = pair["jd_id"]
        resume_id = pair["resume_id"]
        judged.setdefault(job_id, set()).add(resume_id)
        if pair["fit_score"] >= threshold:
            relevant.setdefault(job_id, set()).add(resume_id)
        else:
            relevant.setdefault(job_id, set())
    return relevant, judged


def evaluate_rankings(rankings, pairs, *, k=5, include_gemini_checked=True):
    relevant, judged = judgments_from_pairs(
        pairs, include_gemini_checked=include_gemini_checked
    )
    return matching_metrics(rankings, relevant, judged, k=k)
