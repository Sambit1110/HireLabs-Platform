"""Parser evaluation helpers over already-produced span predictions."""

from .metrics import parser_metrics


def evaluate_parser(gold_rows, predictions_by_id):
    return parser_metrics(gold_rows, predictions_by_id)
