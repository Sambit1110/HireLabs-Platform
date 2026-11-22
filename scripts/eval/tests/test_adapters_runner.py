import json
from pathlib import Path
import contextlib
import io
import tempfile
import unittest

from scripts.eval.adapters import CallableAdapter, UnavailableAdapter
from scripts.eval.cache import ResponseCache
from scripts.eval.run_all import build_error_analysis, evaluate_dataset, main
from scripts.eval.loader import load_dataset
from scripts.eval.tests.helpers import write_prepared_fixture


def valid_evaluator_output():
    return {
        "candidate_summary": "Mock output", "relevant_experience_summary": "",
        "technical_strengths": [], "relevant_projects": [], "fit_verdict": "strong",
        "fit_score": 80, "confidence": 50, "strengths": [], "gaps": [],
        "evidence_signals": [], "risk_flags": [], "interview_questions": [],
        "recommendation": "Review", "skill_gap_analysis": {
            "demonstrated_skills": [], "partially_demonstrated_skills": [],
            "missing_required_skills": [], "missing_preferred_skills": [],
            "unverified_skills": [], "skill_gap_summary": "",
        }, "recruiter_insights": {
            "strongest_alignment": [], "areas_for_verification": [],
            "suggested_interview_focus": [], "overall_assessment": "Review",
        },
    }


class AdapterAndRunnerTests(unittest.TestCase):
    def _dataset(self, temp):
        return load_dataset(write_prepared_fixture(temp), "dev")

    def test_unavailable_adapters_fail_explicitly_and_callable_is_mockable(self):
        unavailable = UnavailableAdapter("remote", "not configured")
        self.assertFalse(unavailable.status().available)
        with self.assertRaisesRegex(RuntimeError, "not configured"):
            unavailable.predict({})
        adapter = CallableAdapter("mock", lambda payload: {"seen": payload["x"]})
        self.assertTrue(adapter.status().available)
        self.assertEqual(adapter.predict({"x": 3}), {"seen": 3})

    def test_runner_scores_only_keyword_baselines_and_keeps_other_systems_null(self):
        with tempfile.TemporaryDirectory() as temp:
            dataset = self._dataset(temp)
            run = evaluate_dataset(dataset)
            tasks = run.tasks
            self.assertEqual([task["id"] for task in tasks], ["parser", "matching", "evaluator"])
            self.assertIsNotNone(tasks[0]["systems"][0]["values"]["f1_micro"])
            self.assertIsNone(tasks[1]["systems"][1]["values"]["recall_at_5"])
            self.assertIsNotNone(tasks[2]["systems"][0]["values"]["valid_json_percentage"])
            self.assertEqual(run.split, "dev")
            self.assertEqual(run.manifest_sha256, dataset.manifest_sha256)
            errors = build_error_analysis(dataset)
            self.assertEqual(errors["matching"]["eligible_queries"], 1)
            self.assertNotIn("r_dev", str(errors))

            unavailable = evaluate_dataset(dataset, adapters={
                "spacy_parser": UnavailableAdapter("not-loaded", "model handoff pending"),
                "hirelabs_evaluator": UnavailableAdapter("evaluator", "pending"),
            }).tasks
            self.assertIsNone(unavailable[0]["systems"][2]["values"]["f1_micro"])
            self.assertIsNone(unavailable[2]["systems"][2]["values"]["valid_json_percentage"])

    def test_runner_injects_mock_task_adapters_and_reuses_cached_predictions(self):
        with tempfile.TemporaryDirectory() as temp:
            dataset = self._dataset(temp)
            self._exercise_cached_adapters(dataset, temp)

    def _exercise_cached_adapters(self, dataset, temp):
        calls = {"parser": 0, "matcher": 0, "evaluator": 0}

        def parser_predict(payload):
            calls["parser"] += 1
            return [
                {"start": 0, "end": 8, "label": "NAME"},
                {"start": 9, "end": 15, "label": "SKILL"},
            ]

        def matcher_predict(payload):
            calls["matcher"] += 1
            return [candidate["id"] for candidate in payload["candidates"]]

        def evaluator_predict(_payload):
            calls["evaluator"] += 1
            return json.dumps(valid_evaluator_output(), sort_keys=True)

        adapters = {
            "spacy_parser": CallableAdapter("mock-parser", parser_predict),
            "hirelabs_matcher": CallableAdapter("mock-matcher", matcher_predict),
            "hirelabs_evaluator": CallableAdapter("mock-evaluator", evaluator_predict),
        }
        cache = ResponseCache(Path(temp) / "cache")
        first = evaluate_dataset(dataset, adapters=adapters, cache=cache).tasks
        after_first = calls.copy()
        second = evaluate_dataset(dataset, adapters=adapters, cache=cache).tasks

        self.assertEqual(calls, after_first)
        self.assertEqual(calls, {"parser": 1, "matcher": 1, "evaluator": 1})
        for tasks in (first, second):
            self.assertEqual(tasks[0]["systems"][2]["values"]["f1_micro"], 1.0)
            self.assertEqual(tasks[1]["systems"][2]["values"]["recall_at_5"], 1.0)
            self.assertEqual(tasks[2]["systems"][2]["values"]["valid_json_percentage"], 100.0)
        self.assertEqual(
            first[2]["systems"][2]["values"]["average_response_time_seconds"],
            second[2]["systems"][2]["values"]["average_response_time_seconds"],
        )

    def test_cli_rejects_test_split_and_final_public_output_before_loading_data(self):
        repo_root = Path(__file__).resolve().parents[3]
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "development.json"
            for args in (
                ["--dataset-root", str(Path(temp) / "missing"), "--split", "test", "--output", str(output)],
                ["--dataset-root", str(Path(temp) / "missing"), "--output", str(repo_root / "public/model-results.json")],
            ):
                with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as caught:
                    main(args)
                self.assertEqual(caught.exception.code, 2)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
