"""Candidate evaluator metric helpers over supplied outputs and timings."""

from .metrics import evaluator_metrics, evaluator_output_is_valid


def evaluate_candidates(gold_pairs, responses_by_pair, response_times_by_pair=None):
    return evaluator_metrics(gold_pairs, responses_by_pair, response_times_by_pair)
