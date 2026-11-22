import json
from pathlib import Path
import tempfile
import unittest

from scripts.eval.loader import load_dataset
from scripts.eval.run_all import evaluate_dataset
from scripts.eval.provenance import EvaluationRun, EvaluationTaskResult
import scripts.eval.provenance as provenance
from scripts.eval.results_writer import (
    ResultsValidationError, build_task, create_results_artifact, dashboard_projection,
    validate_dashboard_results, write_results,
)


def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")


def task_fixture(value=0.8):
    return [build_task("matching", {"Keyword baseline": {
        "recall_at_5": value, "mrr": value, "success_at_5": value,
    }})]


def test_dataset(root, split="test"):
    if split == "test":
        manifest = {"r_dev": "dev", "r_test": "test"}
        (root / "test/raw/resumes").mkdir(parents=True)
        (root / "test/raw/resumes/r_test.txt").write_text("text", encoding="utf-8")
        write_jsonl(root / "test/parser_test.jsonl", [{"id": "r_test", "text": "text", "entities": []}])
        write_jsonl(root / "test/pairs_test.jsonl", [{"pair_id": "p1", "resume_id": "r_test", "jd_id": "j1", "fit_score": 80, "fit_verdict": "strong", "label_source": "human"}])
        (root / "raw/resumes").mkdir(parents=True)
        (root / "raw/resumes/r_dev.txt").write_text("text", encoding="utf-8")
        write_jsonl(root / "parser/dev.jsonl", [{"id": "r_dev", "text": "text", "entities": []}])
        write_jsonl(root / "pairs/dev.jsonl", [{"pair_id": "p_dev", "resume_id": "r_dev", "jd_id": "j1", "fit_score": 80, "fit_verdict": "strong", "label_source": "human"}])
        (root / "raw/jds").mkdir(parents=True)
        (root / "raw/jds/j1.txt").write_text("job", encoding="utf-8")
        (root / "splits.json").write_text(json.dumps(manifest), encoding="utf-8")
        return load_dataset(root, "test", allow_test=True)


class ResultsWriterTests(unittest.TestCase):
    def _artifact(self, dataset):
        evaluation_result = evaluate_dataset(dataset)
        return create_results_artifact(
            split="test", resumes=dataset.split_resume_count, pairs=len(dataset.pairs),
            evaluation_result=evaluation_result, generated_at="2026-11-22T12:00:00Z",
            source_dataset=dataset,
        ), evaluation_result

    def test_canonical_artifact_and_dashboard_projection_keep_missing_null(self):
        with tempfile.TemporaryDirectory() as temp:
            dataset = test_dataset(Path(temp))
            artifact, evaluation_result = self._artifact(dataset)
            dashboard = dashboard_projection(
                artifact, source_dataset=dataset, evaluation_result=evaluation_result
            )
            self.assertEqual(dashboard["test_set"]["resumes"], 1)
            self.assertIsNone(dashboard["tasks"][1]["systems"][1]["values"]["recall_at_5"])
            self.assertNotIn("schema_version", dashboard)
            self.assertNotIn("split", dashboard)
            validate_dashboard_results(dashboard)

    def test_dev_artifact_cannot_be_projected_or_published_as_test(self):
        with self.assertRaisesRegex(ResultsValidationError, "runner-created metrics provenance"):
            create_results_artifact(split="test", resumes=1, pairs=0, tasks=task_fixture())
        with self.assertRaisesRegex(ResultsValidationError, "Only locked test"):
            dashboard_projection(create_results_artifact(split="dev", resumes=0, pairs=0, tasks=task_fixture()))

    def test_rejects_unsafe_metadata_and_invalid_values(self):
        unsafe = task_fixture()
        unsafe[0]["description"] = "private resume text"
        with self.assertRaises(ResultsValidationError):
            create_results_artifact(split="dev", resumes=0, pairs=0, tasks=unsafe)
        with self.assertRaisesRegex(ResultsValidationError, "finite numbers or null"):
            build_task("matching", {"Keyword baseline": {"recall_at_5": float("nan")}})

    def test_writes_files_atomically_and_dashboard_requires_provenance(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            dataset = test_dataset(root)
            canonical, dashboard = root / "results/results.json", root / "public/model-results.json"
            artifact, evaluation_result = self._artifact(dataset)
            # The publication API must receive the same runner-created evaluation result.
            with self.assertRaisesRegex(ResultsValidationError, "metrics evaluated"):
                write_results(artifact, canonical, dashboard, source_dataset=dataset)
            outputs = write_results(artifact, canonical, dashboard, source_dataset=dataset,
                                    evaluation_result=evaluation_result)
            self.assertEqual(outputs, (canonical, dashboard))
            self.assertEqual(json.loads(canonical.read_text())["split"], "test")
            self.assertEqual(json.loads(dashboard.read_text())["test_set"]["pairs"], 1)
            self.assertEqual(list(root.rglob("*.tmp")), [])

    def test_dev_metrics_cannot_be_published_with_matching_count_test_data(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            test_data = test_dataset(root)
            dev_data = load_dataset(root, "dev")
            dev_result = evaluate_dataset(dev_data)
            self.assertEqual(dev_data.split_resume_count, test_data.split_resume_count)
            self.assertEqual(len(dev_data.pairs), len(test_data.pairs))
            with self.assertRaisesRegex(ResultsValidationError, "provenance does not match"):
                create_results_artifact(
                    split="test", resumes=test_data.split_resume_count,
                    pairs=len(test_data.pairs), evaluation_result=dev_result,
                    source_dataset=test_data,
                )
            dev_artifact = create_results_artifact(
                split="dev", resumes=dev_data.split_resume_count,
                pairs=len(dev_data.pairs), evaluation_result=dev_result,
                source_dataset=dev_data,
            )
            forged_test_artifact = json.loads(json.dumps(dev_artifact))
            forged_test_artifact["split"] = "test"
            forged_test_artifact["dataset"]["description"] = "Held-out test set: never used for training or tuning."
            forged_test_artifact["dataset"]["manifest_sha256"] = test_data.manifest_sha256
            forged_test_artifact["evaluation_config"]["mode"] = "final"
            with self.assertRaisesRegex(ResultsValidationError, "metrics evaluated on this exact test dataset"):
                dashboard_projection(
                    forged_test_artifact, source_dataset=test_data,
                    evaluation_result=dev_result,
                )

    def test_supported_provenance_construction_routes_are_closed(self):
        with tempfile.TemporaryDirectory() as dev_dir, tempfile.TemporaryDirectory() as test_dir:
            test_dataset(Path(dev_dir))
            dev_data = load_dataset(Path(dev_dir), "dev")
            test_data = test_dataset(Path(test_dir))
            dev_run = evaluate_dataset(dev_data)
            test_run = evaluate_dataset(test_data)
            dev_task_dicts = dev_run.tasks

            # The former arbitrary-dictionary wrapping helpers no longer exist.
            self.assertFalse(hasattr(provenance, "_task_result_from_execution"))
            self.assertFalse(hasattr(provenance, "_run_from_execution"))
            for task in dev_task_dicts:
                with self.assertRaises(TypeError):
                    EvaluationTaskResult(split="test", task=task, dataset=test_data)
            with self.assertRaises(TypeError):
                EvaluationRun(split="test", task_results=dev_task_dicts, dataset=test_data)
            with self.assertRaises(TypeError):
                EvaluationRun(task_results=dev_run.task_results, dataset=test_data)

            with self.assertRaisesRegex(ResultsValidationError, "provenance does not match"):
                create_results_artifact(
                    split="test", resumes=test_data.split_resume_count,
                    pairs=len(test_data.pairs), evaluation_result=dev_run,
                    source_dataset=test_data,
                )

            # Returned task dictionaries are detached; editing one cannot alter
            # the trusted task payload stored by the run.
            original = dev_run.tasks
            dev_task_dicts[0]["systems"][0]["values"]["f1_micro"] = 0.0
            self.assertEqual(dev_run.tasks, original)

            another_test_data = test_dataset(Path(test_dir) / "copy")
            with self.assertRaisesRegex(ResultsValidationError, "provenance does not match"):
                create_results_artifact(
                    split="test", resumes=another_test_data.split_resume_count,
                    pairs=len(another_test_data.pairs), evaluation_result=test_run,
                    source_dataset=another_test_data,
                )

    def test_test_publication_rejects_changed_manifest_or_task_metrics(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            dataset = test_dataset(root)
            result = evaluate_dataset(dataset)
            artifact = create_results_artifact(
                split="test", resumes=dataset.split_resume_count, pairs=len(dataset.pairs),
                evaluation_result=result, source_dataset=dataset,
            )
            with self.assertRaisesRegex(ResultsValidationError, "Dashboard publication requires metrics"):
                dashboard_projection(artifact, source_dataset=dataset)

            artifact["tasks"][1]["systems"][0]["values"]["recall_at_5"] = 0.0
            with self.assertRaisesRegex(ResultsValidationError, "task metrics do not match"):
                dashboard_projection(artifact, source_dataset=dataset, evaluation_result=result)

        with tempfile.TemporaryDirectory() as first, tempfile.TemporaryDirectory() as second:
            first_dataset = test_dataset(Path(first))
            result = evaluate_dataset(first_dataset)
            second_root = Path(second)
            second_dataset = test_dataset(second_root)
            # Same logical manifest, different bytes/digest, to isolate digest mismatch.
            (second_root / "splits.json").write_text(
                json.dumps({"r_dev": "dev", "r_test": "test"}, indent=2), encoding="utf-8"
            )
            second_dataset = load_dataset(second_root, "test", allow_test=True)
            self.assertNotEqual(first_dataset.manifest_sha256, second_dataset.manifest_sha256)
            with self.assertRaisesRegex(ResultsValidationError, "provenance does not match"):
                create_results_artifact(
                    split="test", resumes=second_dataset.split_resume_count,
                    pairs=len(second_dataset.pairs), evaluation_result=result,
                    source_dataset=second_dataset,
                )

    def test_run_provenance_checks_split_digest_and_dataset_identity(self):
        with tempfile.TemporaryDirectory() as first, tempfile.TemporaryDirectory() as second:
            dataset = test_dataset(Path(first))
            run = evaluate_dataset(dataset)
            same_digest_different_object = test_dataset(Path(second))
            self.assertEqual(dataset.manifest_sha256, same_digest_different_object.manifest_sha256)
            self.assertTrue(run.matches(dataset))
            self.assertFalse(run.matches(same_digest_different_object))

            original_digest = dataset.manifest_sha256
            object.__setattr__(dataset, "manifest_sha256", "0" * 64)
            self.assertFalse(run.matches(dataset))
            object.__setattr__(dataset, "manifest_sha256", original_digest)

            original_split = dataset.split
            object.__setattr__(dataset, "split", "dev")
            self.assertFalse(run.matches(dataset))
            object.__setattr__(dataset, "split", original_split)

    def test_mixed_dataset_task_results_are_rejected(self):
        with tempfile.TemporaryDirectory() as first, tempfile.TemporaryDirectory() as second:
            first_dataset = test_dataset(Path(first))
            second_dataset = test_dataset(Path(second))
            first_result = evaluate_dataset(first_dataset)
            repeated_first_result = evaluate_dataset(first_dataset)
            second_result = evaluate_dataset(second_dataset)
            with self.assertRaises(TypeError):
                EvaluationRun(
                    task_results=(first_result.task_results[0], second_result.task_results[1]),
                    dataset=first_dataset,
                )
            with self.assertRaises(TypeError):
                EvaluationRun(
                    task_results=(first_result.task_results[0], repeated_first_result.task_results[1]),
                    dataset=first_dataset,
                )


if __name__ == "__main__":
    unittest.main()
