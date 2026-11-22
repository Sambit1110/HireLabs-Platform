import json
from pathlib import Path
import tempfile
import unittest

from scripts.eval.cache import ResponseCache
from scripts.eval.reporting import report_data, write_reports
from scripts.eval.results_writer import build_task, create_results_artifact


class CacheAndReportingTests(unittest.TestCase):
    def test_cache_round_trip_uses_opaque_content_addressed_path(self):
        with tempfile.TemporaryDirectory() as temp:
            cache = ResponseCache(Path(temp) / "cache")
            key = cache.key(task="evaluator", adapter="mock", model="v1", input_value={"resume": "private"})
            cache.put(key, {"score": 3})
            self.assertEqual(cache.get(key), {"score": 3})
            self.assertEqual([path.name for path in (Path(temp) / "cache").iterdir()], [f"{key}.json"])

    def test_reports_contain_aggregates_without_per_example_data(self):
        tasks = [
            build_task("parser", {"Keyword baseline": {"f1_micro": 0.5}}),
            build_task("matching", {"Keyword baseline": {"recall_at_5": 0.5, "mrr": 0.4, "success_at_5": 0.6}}),
            build_task("evaluator", {"Keyword baseline": {"verdict_accuracy": 50.0}}),
        ]
        artifact = create_results_artifact(split="dev", resumes=2, pairs=1, tasks=tasks)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            write_reports(artifact, root / "compare.md", root / "charts.json", root / "errors.json",
                          evaluation_section_path=root / "evaluation-section.md")
            self.assertIn("Recall@5", (root / "compare.md").read_text(encoding="utf-8"))
            charts = json.loads((root / "charts.json").read_text(encoding="utf-8"))
            self.assertEqual(len(charts), 3)
            self.assertEqual({chart["task"] for chart in charts}, {"parser", "matching", "evaluator"})
            unavailable = next(item for item in charts[1]["metrics"][0]["systems"] if item["kind"] == "gemini")
            self.assertEqual(unavailable["availability"], "unavailable")
            self.assertIsNone(unavailable["value"])
            self.assertIn("baseline", (root / "compare.md").read_text(encoding="utf-8"))
            self.assertIn("Gemini", (root / "evaluation-section.md").read_text(encoding="utf-8"))
            self.assertIn("unavailable", (root / "evaluation-section.md").read_text(encoding="utf-8"))
            errors = json.loads((root / "errors.json").read_text(encoding="utf-8"))
            self.assertEqual(len(errors), 3)
            self.assertTrue(all(error["system"] == "Keyword baseline" for error in errors))
            self.assertNotIn("private", (root / "errors.json").read_text(encoding="utf-8"))
            with self.assertRaisesRegex(ValueError, "Parser error analysis"):
                report_data(artifact, {"parser": {"resume_text": "private candidate data"}})


if __name__ == "__main__":
    unittest.main()
