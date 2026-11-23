"""Run: python3 -m unittest discover -s scripts/python/tests -t scripts/python"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from matcher_metrics import mean_spearman, ranking_metrics, spearman  # noqa: E402


class RankingMetrics(unittest.TestCase):
    def test_recall_and_mrr_use_the_first_relevant_rank(self):
        rankings = {"j1": ["a", "b", "c", "d", "e", "f"], "j2": ["x", "y", "z", "w", "v", "u"]}
        relevant = {"j1": {"b"}, "j2": {"u"}}
        result = ranking_metrics(rankings, relevant, ks=(5, 10))
        self.assertEqual(result["queries"], 2)
        self.assertAlmostEqual(result["recall_at_5"], 0.5)
        self.assertAlmostEqual(result["recall_at_10"], 1.0)
        self.assertAlmostEqual(result["mrr"], (1 / 2 + 1 / 6) / 2)
        self.assertEqual(result["first_relevant_rank"], {"j1": 2, "j2": 6})

    def test_queries_without_relevant_resumes_are_skipped(self):
        result = ranking_metrics({"j1": ["a"], "j2": ["b"]}, {"j1": {"a"}, "j2": set()})
        self.assertEqual(result["queries"], 1)
        self.assertEqual(result["mrr"], 1.0)

    def test_a_relevant_resume_missing_from_the_ranking_scores_zero(self):
        result = ranking_metrics({"j1": ["a", "b"]}, {"j1": {"zzz"}})
        self.assertEqual(result["mrr"], 0.0)
        self.assertIsNone(result["first_relevant_rank"]["j1"])


class Spearman(unittest.TestCase):
    def test_perfect_and_reversed_order(self):
        self.assertAlmostEqual(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1.0)
        self.assertAlmostEqual(spearman([1, 2, 3, 4], [40, 30, 20, 10]), -1.0)

    def test_ties_use_average_ranks(self):
        self.assertAlmostEqual(spearman([1, 2, 2, 3], [1, 2, 3, 4]), spearman([1.0, 2.5, 2.5, 4.0], [1, 2, 3, 4]))

    def test_constant_input_has_no_correlation(self):
        self.assertIsNone(spearman([5, 5, 5], [1, 2, 3]))

    def test_mean_spearman_skips_undefined_queries(self):
        per_query = {"j1": ([1, 2, 3], [1, 2, 3]), "j2": ([1, 1, 1], [3, 2, 1])}
        self.assertEqual(mean_spearman(per_query), {"mean": 1.0, "queries": 1, "per_query": {"j1": 1.0, "j2": None}})


if __name__ == "__main__":
    unittest.main()
