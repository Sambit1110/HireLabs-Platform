"""Pure task metrics. No model, filesystem, API, or network calls."""

import math
from collections.abc import Mapping

from .config import DEFAULT_RANKING_K, ENTITY_LABELS, FIT_VERDICTS
from .strict_json import StrictJSONError, loads_strict


def _ratio(numerator, denominator):
    return numerator / denominator if denominator else None


def parser_metrics(gold_rows, predictions_by_id):
    """Return per-label exact-span counts and micro scores.

    A span is identified by (document id, start, end, label). Undefined
    precision/recall/F1 values are ``None`` when their denominator is zero.
    """
    if not isinstance(predictions_by_id, Mapping):
        raise ValueError("Parser predictions must be mapped by document identifier.")
    gold, predicted = set(), set()
    gold_ids = set()
    text_by_id = {}
    for row in gold_rows:
        document_id = row["id"]
        if document_id in gold_ids:
            raise ValueError("Gold parser rows contain duplicate document identifiers.")
        gold_ids.add(document_id)
        original_text = row.get("text")
        if not isinstance(original_text, str):
            raise ValueError("Gold parser rows require the original annotated text.")
        text_by_id[document_id] = original_text
        for entity in row["entities"]:
            if not isinstance(entity, Mapping):
                raise ValueError("Gold parser entities must be span mappings.")
            if (not isinstance(entity.get("start"), int) or isinstance(entity.get("start"), bool)
                    or not isinstance(entity.get("end"), int) or isinstance(entity.get("end"), bool)
                    or not 0 <= entity["start"] < entity["end"] <= len(original_text)):
                raise ValueError("Gold parser span offsets are outside the original annotated text.")
            if entity.get("label") not in ENTITY_LABELS:
                raise ValueError("Gold parser rows contain an unsupported entity label.")
            span = (document_id, entity["start"], entity["end"], entity["label"])
            if span in gold:
                raise ValueError("Gold parser rows contain duplicate entity spans.")
            gold.add(span)

    unknown_prediction_ids = set(predictions_by_id) - gold_ids
    if unknown_prediction_ids:
        raise ValueError("Parser predictions contain documents absent from gold data.")
    for document_id, entities in predictions_by_id.items():
        if not isinstance(entities, (list, tuple)):
            raise ValueError("Parser predictions for a document must be a sequence.")
        for entity in entities:
            if not isinstance(entity, Mapping):
                raise ValueError("Parser predictions must be span objects.")
            start, end, label = entity.get("start"), entity.get("end"), entity.get("label")
            if (not isinstance(start, int) or isinstance(start, bool)
                    or not isinstance(end, int) or isinstance(end, bool)
                    or not isinstance(label, str)):
                raise ValueError("Parser predictions require integer offsets and a label.")
            if label not in ENTITY_LABELS:
                raise ValueError("Parser predictions contain an unsupported entity label.")
            if not 0 <= start < end <= len(text_by_id[document_id]):
                raise ValueError("Predicted span offsets are outside the original annotated text.")
            span = (document_id, start, end, label)
            if span in predicted:
                raise ValueError("Parser predictions contain duplicate entity spans.")
            predicted.add(span)

    def score_sets(gold_label, pred_label):
        true_positive = len(gold_label & pred_label)
        false_positive = len(pred_label - gold_label)
        false_negative = len(gold_label - pred_label)
        precision = _ratio(true_positive, true_positive + false_positive)
        recall = _ratio(true_positive, true_positive + false_negative)
        f1 = (
            2 * precision * recall / (precision + recall)
            if precision is not None and recall is not None and precision + recall > 0
            else (0.0 if precision == 0 or recall == 0 else None)
        )
        return {
            "true_positives": true_positive,
            "false_positives": false_positive,
            "false_negatives": false_negative,
            "precision": precision,
            "recall": recall,
            "f1": f1,
        }

    counts = {}
    for label in ENTITY_LABELS:
        gold_label = {span for span in gold if span[3] == label}
        pred_label = {span for span in predicted if span[3] == label}
        counts[label] = score_sets(gold_label, pred_label)
    counts["overall"] = score_sets(gold, predicted)
    return counts


def matching_metrics(rankings, relevant_by_query, judged_by_query, k=DEFAULT_RANKING_K):
    """Compute macro query Recall@k, MRR, and dashboard success@k.

    Candidate lists must contain only candidates explicitly judged for that
    query. Unjudged candidates cause an error; missing relevance labels are
    never silently treated as negative. Queries with no judged relevant
    candidates are reported and excluded from all three averages.
    """
    if type(k) is not int or k != DEFAULT_RANKING_K:
        raise ValueError("The agreed matching evaluation protocol requires k=5.")
    if not all(isinstance(value, Mapping) for value in (rankings, relevant_by_query, judged_by_query)):
        raise ValueError("Matching rankings and judgments must be mappings by query identifier.")

    for ranked_ids in rankings.values():
        if not isinstance(ranked_ids, (list, tuple)):
            raise ValueError("Each query ranking must be a sequence of candidate identifiers.")
        if any(not isinstance(candidate_id, str) or not candidate_id for candidate_id in ranked_ids):
            raise ValueError("Candidate identifiers must be non-empty strings.")
        if len(ranked_ids) != len(set(ranked_ids)):
            raise ValueError("A query ranking contains duplicate candidate identifiers.")
    for judgment_map in (relevant_by_query, judged_by_query):
        for candidates in judgment_map.values():
            if not isinstance(candidates, (set, frozenset, list, tuple)):
                raise ValueError("Judged candidates must be a collection of identifiers.")
            if any(not isinstance(candidate_id, str) or not candidate_id for candidate_id in candidates):
                raise ValueError("Candidate identifiers must be non-empty strings.")
            if len(candidates) != len(set(candidates)):
                raise ValueError("Judgments contain duplicate candidate identifiers.")

    recalls, reciprocal_ranks, successes = [], [], []
    queries_without_judgments = 0
    queries_without_relevant = 0
    query_ids = set(judged_by_query) | set(relevant_by_query) | set(rankings)
    if any(not isinstance(query_id, str) or not query_id for query_id in query_ids):
        raise ValueError("Query identifiers must be non-empty strings.")
    for query_id in sorted(query_ids):
        if query_id not in judged_by_query or query_id not in relevant_by_query:
            queries_without_judgments += 1
            continue
        judged = set(judged_by_query[query_id])
        relevant = set(relevant_by_query[query_id])
        if not relevant.issubset(judged):
            raise ValueError("Relevant candidates must also be present in the judged candidate set.")
        ranked_ids = rankings.get(query_id, [])
        if any(candidate_id not in judged for candidate_id in ranked_ids):
            raise ValueError("Rankings must be restricted to explicitly judged candidates.")
        if not relevant:
            queries_without_relevant += 1
            continue

        top_k = ranked_ids[:k]
        retrieved_relevant = len(set(top_k) & relevant)
        recalls.append(retrieved_relevant / len(relevant))
        successes.append(1.0 if retrieved_relevant else 0.0)
        first_rank = next(
            (index for index, candidate_id in enumerate(ranked_ids, start=1) if candidate_id in relevant),
            None,
        )
        reciprocal_ranks.append(1 / first_rank if first_rank else 0.0)

    query_count = len(recalls)
    return {
        "recall_at_5": {
            "value": sum(recalls) / query_count if query_count else None,
            "queries": query_count,
            "k": k,
        },
        "mrr": {
            "value": sum(reciprocal_ranks) / query_count if query_count else None,
            "queries": query_count,
        },
        "success_at_5": {
            "value": sum(successes) / query_count if query_count else None,
            "queries": query_count,
            "k": k,
        },
        "queries_without_judgments": queries_without_judgments,
        "queries_without_relevant_candidates": queries_without_relevant,
    }


def evaluator_output_is_valid(value):
    """Validate the evaluator response schema, whether parsed or raw JSON."""
    if isinstance(value, str):
        try:
            value = loads_strict(value)
        except (StrictJSONError, TypeError):
            return False
    if not isinstance(value, dict):
        return False

    string_fields = (
        "candidate_summary", "relevant_experience_summary", "recommendation",
    )
    array_fields = (
        "technical_strengths", "relevant_projects", "strengths", "gaps",
        "evidence_signals", "risk_flags", "interview_questions",
    )
    if any(not isinstance(value.get(key), str) for key in string_fields):
        return False
    if any(
        not isinstance(value.get(key), list)
        or len(value[key]) > 30
        or any(not isinstance(item, str) for item in value[key])
        for key in array_fields
    ):
        return False

    verdict = value.get("fit_verdict")
    confidence = value.get("confidence")
    fit_score = value.get("fit_score")
    if verdict not in FIT_VERDICTS:
        return False
    if not isinstance(confidence, int) or isinstance(confidence, bool) or not 0 <= confidence <= 100:
        return False
    if fit_score is None:
        if verdict != "insufficient_evidence":
            return False
    elif (not isinstance(fit_score, (int, float)) or isinstance(fit_score, bool)
          or not math.isfinite(fit_score) or not 0 <= fit_score <= 100):
        return False

    skill_gaps = value.get("skill_gap_analysis")
    required_skill_arrays = (
        "demonstrated_skills", "partially_demonstrated_skills", "missing_required_skills",
        "missing_preferred_skills", "unverified_skills",
    )
    if not isinstance(skill_gaps, dict) or any(
        not isinstance(skill_gaps.get(key), list)
        or len(skill_gaps[key]) > 30
        or any(not isinstance(item, str) for item in skill_gaps[key])
        for key in required_skill_arrays
    ) or not isinstance(skill_gaps.get("skill_gap_summary"), str):
        return False

    insights = value.get("recruiter_insights")
    insight_arrays = ("strongest_alignment", "areas_for_verification", "suggested_interview_focus")
    if not isinstance(insights, dict) or any(
        not isinstance(insights.get(key), list)
        or len(insights[key]) > 30
        or any(not isinstance(item, str) for item in insights[key])
        for key in insight_arrays
    ) or not isinstance(insights.get("overall_assessment"), str):
        return False
    return True


def evaluator_raw_json_is_valid(value):
    """Return true only for a raw strict JSON object response.

    Parsed Python objects cannot establish that the original response was
    valid JSON, so they intentionally do not count here.
    """
    if not isinstance(value, str):
        return False
    try:
        parsed = loads_strict(value)
    except (StrictJSONError, TypeError):
        return False
    return isinstance(parsed, dict)


def evaluator_metrics(gold_pairs, responses_by_pair, response_times_by_pair=None):
    """Calculate candidate metrics; failed or absent responses count invalid.

    Accuracy and score MAE use schema-valid responses with corresponding gold
    values. Valid-JSON percentage uses every gold pair as its denominator.
    Average latency uses every finite non-negative recorded attempt time,
    including attempts with invalid or missing output.
    """
    if response_times_by_pair is None:
        response_times_by_pair = {}
    expected_ids = [row["pair_id"] for row in gold_pairs]
    if len(expected_ids) != len(set(expected_ids)):
        raise ValueError("Gold evaluator pairs contain duplicate identifiers.")
    if not isinstance(responses_by_pair, Mapping):
        raise ValueError("Evaluator responses must be mapped by pair identifier.")
    if set(responses_by_pair) - set(expected_ids):
        raise ValueError("Evaluator responses contain identifiers absent from gold pairs.")
    if response_times_by_pair is not None and (
        not isinstance(response_times_by_pair, Mapping)
        or set(response_times_by_pair) - set(expected_ids)
    ):
        raise ValueError("Evaluator timings contain identifiers absent from gold pairs.")

    valid_json_count = 0
    verdict_correct = verdict_total = 0
    absolute_errors = []
    for row in gold_pairs:
        response = responses_by_pair.get(row["pair_id"])
        if evaluator_raw_json_is_valid(response):
            valid_json_count += 1
        if not evaluator_output_is_valid(response):
            continue
        parsed = loads_strict(response) if isinstance(response, str) else response
        gold_verdict = row.get("fit_verdict")
        if gold_verdict in FIT_VERDICTS:
            verdict_total += 1
            verdict_correct += int(parsed["fit_verdict"] == gold_verdict)
        gold_score = row.get("fit_score")
        if (isinstance(parsed["fit_score"], (int, float)) and not isinstance(parsed["fit_score"], bool)
                and isinstance(gold_score, (int, float)) and not isinstance(gold_score, bool)
                and math.isfinite(gold_score) and 0 <= gold_score <= 100):
            absolute_errors.append(abs(float(parsed["fit_score"]) - float(gold_score)))

    times = []
    for pair_id in expected_ids:
        value = response_times_by_pair.get(pair_id)
        if (isinstance(value, (int, float)) and not isinstance(value, bool)
                and math.isfinite(value) and value >= 0):
            times.append(float(value))
    total_pairs = len(gold_pairs)
    return {
        "verdict_accuracy": {
            "value": _ratio(verdict_correct, verdict_total),
            "correct": verdict_correct,
            "denominator": verdict_total,
        },
        "fit_score_mae": {
            "value": sum(absolute_errors) / len(absolute_errors) if absolute_errors else None,
            "denominator": len(absolute_errors),
        },
        "valid_json_percentage": {
            "value": 100 * _ratio(valid_json_count, total_pairs) if total_pairs else None,
            "valid": valid_json_count,
            "denominator": total_pairs,
        },
        "average_response_time_seconds": {
            "value": sum(times) / len(times) if times else None,
            "denominator": len(times),
        },
    }
