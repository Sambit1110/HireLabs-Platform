import unittest
import json

from scripts.eval.config import ENTITY_LABELS
from scripts.eval.metrics import (
    evaluator_metrics,
    evaluator_output_is_valid,
    evaluator_raw_json_is_valid,
    matching_metrics,
    parser_metrics,
)


def valid_evaluator_output(**overrides):
    value = {
        "candidate_summary": "Summary",
        "relevant_experience_summary": "Experience",
        "technical_strengths": [],
        "relevant_projects": [],
        "fit_verdict": "strong",
        "fit_score": 80,
        "confidence": 70,
        "strengths": [],
        "gaps": [],
        "evidence_signals": [],
        "risk_flags": [],
        "interview_questions": [],
        "recommendation": "Review",
        "skill_gap_analysis": {
            "demonstrated_skills": [], "partially_demonstrated_skills": [],
            "missing_required_skills": [], "missing_preferred_skills": [],
            "unverified_skills": [], "skill_gap_summary": "",
        },
        "recruiter_insights": {
            "strongest_alignment": [], "areas_for_verification": [],
            "suggested_interview_focus": [], "overall_assessment": "Review",
        },
    }
    value.update(overrides)
    return value


class ParserMetricsTests(unittest.TestCase):
    def test_exact_identity_includes_document_offsets_and_label(self):
        gold = [{"id": "r1", "text": "Jane Doe Python", "entities": [
            {"start": 0, "end": 8, "label": "NAME"},
            {"start": 9, "end": 15, "label": "SKILL"},
        ]}]
        predicted = {"r1": [
            {"start": 0, "end": 8, "label": "NAME"},
            {"start": 10, "end": 15, "label": "SKILL"},
            {"start": 9, "end": 15, "label": "TITLE"},
        ]}
        results = parser_metrics(gold, predicted)
        self.assertEqual(set(results), set(ENTITY_LABELS) | {"overall"})
        self.assertEqual(results["NAME"]["true_positives"], 1)
        self.assertEqual(results["SKILL"]["false_negatives"], 1)
        self.assertEqual(results["SKILL"]["false_positives"], 1)
        self.assertEqual(results["TITLE"]["false_positives"], 1)

    def test_duplicate_spans_are_rejected_instead_of_set_deduplicated(self):
        gold = [{"id": "r1", "text": "abc", "entities": [
            {"start": 0, "end": 1, "label": "NAME"},
            {"start": 0, "end": 1, "label": "NAME"},
        ]}]
        with self.assertRaisesRegex(ValueError, "duplicate entity"):
            parser_metrics(gold, {})
        with self.assertRaisesRegex(ValueError, "duplicate entity"):
            parser_metrics([{"id": "r1", "text": "abc", "entities": []}], {"r1": [
                {"start": 0, "end": 1, "label": "NAME"},
                {"start": 0, "end": 1, "label": "NAME"},
            ]})

    def test_zero_denominators_are_none_and_no_overlap_f1_is_zero(self):
        results = parser_metrics(
            [{"id": "r1", "text": "x", "entities": [{"start": 0, "end": 1, "label": "NAME"}]}],
            {"r1": [{"start": 0, "end": 1, "label": "TITLE"}]},
        )
        self.assertIsNone(results["DEGREE"]["precision"])
        self.assertIsNone(results["DEGREE"]["recall"])
        self.assertIsNone(results["DEGREE"]["f1"])
        self.assertEqual(results["NAME"]["f1"], 0.0)
        self.assertEqual(results["TITLE"]["f1"], 0.0)


class MatchingMetricsTests(unittest.TestCase):
    def test_conventional_recall_mrr_and_binary_hit_rate_differ(self):
        rankings = {"j1": ["a", "c", "b", "d", "e", "f"]}
        relevant = {"j1": {"a", "b", "f"}}
        judged = {"j1": {"a", "b", "c", "d", "e", "f"}}
        result = matching_metrics(rankings, relevant, judged)
        self.assertAlmostEqual(result["recall_at_5"]["value"], 2 / 3)
        self.assertEqual(result["mrr"]["value"], 1.0)
        self.assertEqual(result["success_at_5"]["value"], 1.0)

    def test_unjudged_candidates_are_errors_not_negative_labels(self):
        with self.assertRaisesRegex(ValueError, "explicitly judged"):
            matching_metrics({"j1": ["unjudged", "r1"]}, {"j1": {"r1"}}, {"j1": {"r1"}})

    def test_queries_without_relevance_or_judgments_are_reported_and_excluded(self):
        result = matching_metrics(
            {"no_positive": ["a"], "missing_qrels": ["b"]},
            {"no_positive": set()},
            {"no_positive": {"a"}},
        )
        self.assertIsNone(result["recall_at_5"]["value"])
        self.assertEqual(result["queries_without_relevant_candidates"], 1)
        self.assertEqual(result["queries_without_judgments"], 1)

    def test_relevant_query_missing_from_a_system_ranking_counts_as_zero(self):
        result = matching_metrics(
            {"j1": ["a", "b"]},
            {"j1": {"a"}, "j2": {"x"}},
            {"j1": {"a", "b"}, "j2": {"x", "y"}},
        )
        self.assertEqual(result["recall_at_5"]["queries"], 2)
        self.assertEqual(result["recall_at_5"]["value"], 0.5)
        self.assertEqual(result["mrr"]["value"], 0.5)


class EvaluatorMetricsTests(unittest.TestCase):
    def test_schema_validity_requires_fit_score_and_nested_contract(self):
        self.assertTrue(evaluator_output_is_valid(valid_evaluator_output()))
        self.assertTrue(evaluator_output_is_valid(valid_evaluator_output(
            fit_verdict="insufficient_evidence", fit_score=None
        )))
        self.assertFalse(evaluator_output_is_valid(valid_evaluator_output(fit_score=None)))
        self.assertFalse(evaluator_output_is_valid('{"fit_verdict":'))
        self.assertFalse(evaluator_output_is_valid({**valid_evaluator_output(), "fit_score": "80"}))
        nested = valid_evaluator_output()
        del nested["recruiter_insights"]["overall_assessment"]
        self.assertFalse(evaluator_output_is_valid(nested))

    def test_accuracy_mae_valid_json_and_latency_denominators(self):
        gold = [
            {"pair_id": "p1", "fit_verdict": "strong", "fit_score": 75},
            {"pair_id": "p2", "fit_verdict": "weak", "fit_score": 30},
        ]
        responses = {
            "p1": json.dumps(valid_evaluator_output(fit_score=80)),
            "p2": "not json",
        }
        result = evaluator_metrics(gold, responses, {"p1": 1.5, "p2": 2.5})
        self.assertEqual(result["verdict_accuracy"], {"value": 1.0, "correct": 1, "denominator": 1})
        self.assertEqual(result["fit_score_mae"]["value"], 5.0)
        self.assertEqual(result["valid_json_percentage"]["value"], 50.0)
        self.assertEqual(result["valid_json_percentage"]["denominator"], 2)
        self.assertEqual(result["average_response_time_seconds"]["value"], 2.0)
        self.assertEqual(result["average_response_time_seconds"]["denominator"], 2)

    def test_valid_json_requires_strict_raw_object_text(self):
        valid = json.dumps(valid_evaluator_output())
        self.assertTrue(evaluator_raw_json_is_valid(valid))
        for invalid in (
            '{"candidate_summary":"first","candidate_summary":"second"}',
            "{ malformed",
            '{"value":NaN}',
            '{"value":Infinity}',
            '{"value":-Infinity}',
            "[]",
        ):
            with self.subTest(invalid=invalid):
                self.assertFalse(evaluator_raw_json_is_valid(invalid))
        self.assertFalse(evaluator_raw_json_is_valid(valid_evaluator_output()))

    def test_parsed_object_preserves_schema_scores_but_not_json_validity(self):
        gold = [{"pair_id": "p1", "fit_verdict": "strong", "fit_score": 75}]
        result = evaluator_metrics(gold, {"p1": valid_evaluator_output(fit_score=80)})
        self.assertEqual(result["verdict_accuracy"]["value"], 1.0)
        self.assertEqual(result["fit_score_mae"]["value"], 5.0)
        self.assertEqual(result["valid_json_percentage"]["value"], 0.0)

    def test_missing_raw_responses_are_invalid_and_keep_all_pair_denominator(self):
        gold = [{"pair_id": "p1", "fit_verdict": "strong", "fit_score": 75}]
        result = evaluator_metrics(gold, {})
        self.assertEqual(result["valid_json_percentage"]["value"], 0.0)
        self.assertEqual(result["valid_json_percentage"]["denominator"], 1)
        self.assertIsNone(result["verdict_accuracy"]["value"])
        self.assertIsNone(result["fit_score_mae"]["value"])

    def test_zero_denominator_metrics_are_null(self):
        result = evaluator_metrics([], {}, {})
        self.assertIsNone(result["verdict_accuracy"]["value"])
        self.assertIsNone(result["fit_score_mae"]["value"])
        self.assertIsNone(result["valid_json_percentage"]["value"])
        self.assertIsNone(result["average_response_time_seconds"]["value"])


if __name__ == "__main__":
    unittest.main()
