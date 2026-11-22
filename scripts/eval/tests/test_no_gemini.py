"""The evaluation compares the team's models with the keyword baseline only: no Gemini anywhere."""
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.eval import bias_check, run_all
from scripts.eval.adapters import unavailable_model_adapters
from scripts.eval.results_writer import ResultsValidationError, build_task
from scripts.eval.serving_adapters import configured


class NoGeminiSystems(unittest.TestCase):
    def test_tasks_list_only_the_baseline_and_our_models(self):
        for task, ours in (("parser", "hirelabs-parser"), ("matching", "hirelabs-matcher"), ("evaluator", "hirelabs-evaluator")):
            systems = {system["name"]: system["kind"] for system in build_task(task, {})["systems"]}
            self.assertEqual(systems, {"Keyword baseline": "baseline", ours: "ours"})

    def test_rejects_a_gemini_system(self):
        with self.assertRaises(ResultsValidationError):
            build_task("evaluator", {"Gemini": {"verdict_accuracy": 80.0}})

    def test_no_gemini_adapters(self):
        self.assertFalse(any("gemini" in key for key in unavailable_model_adapters()))
        self.assertFalse(any("gemini" in key for adapters in run_all._ADAPTER_SYSTEMS.values() for key in adapters))
        with patch.dict(os.environ, {"HIRELABS_EVAL_ADAPTERS": "gemini_evaluator"}, clear=True):
            with self.assertRaises(ValueError):
                configured()


class BiasCheckLocalOnly(unittest.TestCase):
    def test_measures_only_the_local_evaluator(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "fairness.json"
            argv = ["bias_check.py", "cases.jsonl", "--output", str(output)]
            with patch.object(sys, "argv", argv), \
                 patch.dict(os.environ, {"HIRELABS_ACCESS_TOKEN": "fixture"}, clear=True), \
                 patch.object(bias_check, "load_cases", return_value=[{"id": "c1"}]), \
                 patch.object(bias_check, "measure", return_value={"verdict_flips": 0}) as measure, \
                 patch("sys.stdout", io.StringIO()):
                bias_check.main()
            self.assertEqual([call.args[3] for call in measure.call_args_list], ["local"])
            self.assertEqual(set(json.loads(output.read_text(encoding="utf-8"))), {"local"})


if __name__ == "__main__":
    unittest.main()
