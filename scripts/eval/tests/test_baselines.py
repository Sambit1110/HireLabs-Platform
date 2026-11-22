import unittest

from scripts.eval.baselines import (
    evaluator_keyword_baseline,
    extract_skills,
    find_skill_spans,
    keyword_match_score,
    parser_keyword_baseline,
    rank_candidates,
)


class BaselineTests(unittest.TestCase):
    def test_skill_catalog_aliases_and_whole_token_matching(self):
        self.assertEqual(extract_skills("Built with NodeJS, ReactJS and PostgreSQL."), ["React", "Node.js", "PostgreSQL"])
        self.assertNotIn("Java", extract_skills("Experienced JavaScript developer"))
        self.assertNotIn("Go", extract_skills("I like to go running"))
        self.assertIn("Go", extract_skills("Services written in Go"))

    def test_skill_spans_refer_to_original_character_offsets(self):
        text = "Built Node.js apps with C++ and Node.js."
        spans = find_skill_spans(text)
        self.assertEqual([text[item["start"]:item["end"]] for item in spans], ["Node.js", "C++", "Node.js"])
        self.assertTrue(all(item["label"] == "SKILL" for item in spans))

    def test_parser_baseline_extracts_only_supported_heuristics(self):
        text = "Jane Doe\nSenior Backend Engineer\n7 years of experience with Python and React; 4 years at university."
        spans = parser_keyword_baseline(text)
        actual = {(text[s["start"]:s["end"]], s["label"]) for s in spans}
        self.assertIn(("Jane Doe", "NAME"), actual)
        self.assertIn(("Backend Engineer", "TITLE"), actual)
        self.assertIn(("7 years", "YEARS_EXPERIENCE"), actual)
        self.assertIn(("Python", "SKILL"), actual)
        self.assertNotIn("COMPANY", {s["label"] for s in spans})
        self.assertNotIn("DEGREE", {s["label"] for s in spans})

    def test_skill_overlap_and_evaluator_verdict_thresholds(self):
        score = keyword_match_score(
            "Python and React projects", "Required Python, React, and AWS", role="Engineer"
        )
        self.assertEqual(score["score"], 67)
        self.assertEqual(score["matched"], ["Python", "React"])
        self.assertEqual(evaluator_keyword_baseline("Python React AWS", "Python React AWS")["fit_verdict"], "strong")
        self.assertEqual(evaluator_keyword_baseline("Python", "Python React")["fit_verdict"], "moderate")
        self.assertEqual(evaluator_keyword_baseline("", "Python React")["fit_verdict"], "weak")
        self.assertEqual(evaluator_keyword_baseline("", "role and team")["fit_verdict"], "insufficient_evidence")
        self.assertIsNone(evaluator_keyword_baseline("", "role and team")["fit_score"])

    def test_ranking_ties_use_candidate_id_and_duplicate_ids_fail(self):
        candidates = [
            {"id": "z", "text": "Python"}, {"id": "a", "text": "Python"},
        ]
        ranked = rank_candidates(candidates, "Python")
        self.assertEqual([row["id"] for row in ranked], ["a", "z"])
        with self.assertRaisesRegex(ValueError, "unique"):
            rank_candidates([candidates[0], candidates[0]], "Python")


if __name__ == "__main__":
    unittest.main()
