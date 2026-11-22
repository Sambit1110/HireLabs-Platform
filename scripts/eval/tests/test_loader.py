import json
from pathlib import Path
import tempfile
import unittest

from scripts.eval.config import ModelUnavailableError, require_models_available
from scripts.eval.loader import DatasetValidationError, load_dataset
from scripts.eval.tests.helpers import write_prepared_fixture


def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")


class DatasetLoaderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "splits.json").write_text(
            json.dumps({"r_0001": "dev"}), encoding="utf-8"
        )
        text = "Jane Doe Python"
        (self.root / "raw/resumes").mkdir(parents=True)
        (self.root / "raw/jds").mkdir(parents=True)
        (self.root / "raw/resumes/r_0001.txt").write_text(text, encoding="utf-8")
        (self.root / "raw/jds/j_0001.txt").write_text("Requires Python", encoding="utf-8")
        write_jsonl(self.root / "parser/dev.jsonl", [{
            "id": "r_0001", "text": text,
            "entities": [{"start": 0, "end": 8, "label": "NAME"}],
        }])
        write_jsonl(self.root / "pairs/dev.jsonl", [{
            "pair_id": "p_0001", "resume_id": "r_0001", "jd_id": "j_0001",
            "fit_score": 80, "fit_verdict": "strong", "label_source": "human",
        }])

    def tearDown(self):
        self.temp.cleanup()

    def test_loads_shared_plan_dev_files_and_references(self):
        dataset = load_dataset(self.root, "dev")
        self.assertEqual(dataset.split, "dev")
        self.assertEqual(dataset.parser_rows[0]["text"], "Jane Doe Python")
        self.assertEqual(dataset.pairs[0]["fit_score"], 80)
        self.assertIn("j_0001", dataset.jobs)

    def test_prepared_shared_resume_layout_loads_train_and_dev_independently(self):
        with tempfile.TemporaryDirectory() as temp:
            root = write_prepared_fixture(temp)
            train = load_dataset(root, "train")
            dev = load_dataset(root, "dev")

            self.assertEqual([row["id"] for row in train.parser_rows], ["r_train"])
            self.assertEqual([row["id"] for row in dev.parser_rows], ["r_dev"])
            self.assertEqual([row["pair_id"] for row in train.pairs], ["p_train"])
            self.assertEqual([row["pair_id"] for row in dev.pairs], ["p_dev"])
            self.assertEqual(set(train.resumes), {"r_train", "r_dev"})
            self.assertEqual(set(dev.resumes), {"r_train", "r_dev"})
            self.assertEqual(train.split_resume_count, 1)
            self.assertEqual(dev.split_resume_count, 1)

    def test_shared_resume_directory_rejects_missing_or_test_resume_ids(self):
        with tempfile.TemporaryDirectory() as temp:
            root = write_prepared_fixture(temp)
            (root / "raw/resumes/r_dev.txt").unlink()
            with self.assertRaisesRegex(DatasetValidationError, "layout manifest"):
                load_dataset(root, "train")

        with tempfile.TemporaryDirectory() as temp:
            root = write_prepared_fixture(temp)
            (root / "raw/resumes/r_test.txt").write_text("unexpected", encoding="utf-8")
            with self.assertRaisesRegex(DatasetValidationError, "layout manifest"):
                load_dataset(root, "dev")

        with tempfile.TemporaryDirectory() as temp:
            root = write_prepared_fixture(temp)
            (root / "raw/resumes/r_unlisted.txt").write_text("unexpected", encoding="utf-8")
            with self.assertRaisesRegex(DatasetValidationError, "layout manifest"):
                load_dataset(root, "train")

    def test_malformed_jsonl_reports_path_and_line_without_content(self):
        target = self.root / "pairs/dev.jsonl"
        target.write_text('{"private":"must-not-appear"\n', encoding="utf-8")
        with self.assertRaises(DatasetValidationError) as caught:
            load_dataset(self.root, "dev")
        self.assertIn("line 1", str(caught.exception))
        self.assertNotIn("must-not-appear", str(caught.exception))

    def test_blank_jsonl_rows_are_rejected_instead_of_silently_skipped(self):
        target = self.root / "pairs/dev.jsonl"
        target.write_text("\n", encoding="utf-8")
        with self.assertRaisesRegex(DatasetValidationError, "Empty JSONL row.*line 1"):
            load_dataset(self.root, "dev")

    def test_empty_required_jsonl_files_are_rejected(self):
        for relative in ("parser/dev.jsonl", "pairs/dev.jsonl"):
            with self.subTest(relative=relative):
                target = self.root / relative
                target.write_text("", encoding="utf-8")
                with self.assertRaisesRegex(DatasetValidationError, "contains no records"):
                    load_dataset(self.root, "dev")
                # Restore the fixture row before checking the other required file.
                if relative.startswith("parser/"):
                    write_jsonl(target, [{"id": "r_0001", "text": "Jane Doe Python", "entities": []}])
                else:
                    write_jsonl(target, [{
                        "pair_id": "p_0001", "resume_id": "r_0001", "jd_id": "j_0001",
                        "fit_score": 80, "fit_verdict": "strong", "label_source": "human",
                    }])

    def test_rejects_duplicate_parser_and_pair_identifiers(self):
        parser_row = {"id": "r_0001", "text": "Jane Doe Python", "entities": []}
        write_jsonl(self.root / "parser/dev.jsonl", [parser_row, parser_row])
        with self.assertRaisesRegex(DatasetValidationError, "duplicate parser"):
            load_dataset(self.root, "dev")

        write_jsonl(self.root / "parser/dev.jsonl", [parser_row])
        pair = {
            "pair_id": "p_0001", "resume_id": "r_0001", "jd_id": "j_0001",
            "fit_score": 80, "fit_verdict": "strong", "label_source": "human",
        }
        write_jsonl(self.root / "pairs/dev.jsonl", [pair, {**pair, "pair_id": "p_0002"}])
        with self.assertRaisesRegex(DatasetValidationError, "duplicate pair"):
            load_dataset(self.root, "dev")

    def test_rejects_bad_span_boundaries_labels_and_pair_references(self):
        row = {"id": "r_0001", "text": "Jane Doe Python", "entities": [
            {"start": 0, "end": 99, "label": "NAME"},
        ]}
        write_jsonl(self.root / "parser/dev.jsonl", [row])
        with self.assertRaisesRegex(DatasetValidationError, "out of bounds"):
            load_dataset(self.root, "dev")

        row["entities"] = [{"start": 0, "end": 8, "label": "UNKNOWN"}]
        write_jsonl(self.root / "parser/dev.jsonl", [row])
        with self.assertRaisesRegex(DatasetValidationError, "unsupported entity"):
            load_dataset(self.root, "dev")

        row["entities"] = []
        write_jsonl(self.root / "parser/dev.jsonl", [row])
        pair = {
            "pair_id": "p_0001", "resume_id": "r_missing", "jd_id": "j_0001",
            "fit_score": 80, "fit_verdict": "strong", "label_source": "human",
        }
        write_jsonl(self.root / "pairs/dev.jsonl", [pair])
        with self.assertRaisesRegex(DatasetValidationError, "unknown resume"):
            load_dataset(self.root, "dev")

    def test_missing_data_fails_clearly(self):
        with self.assertRaisesRegex(DatasetValidationError, "Missing required dataset file"):
            load_dataset(self.root / "absent", "dev")

    def test_test_split_requires_explicit_opt_in_and_never_autodiscovers(self):
        with self.assertRaisesRegex(DatasetValidationError, "explicit allow_test"):
            load_dataset(self.root, "test")
        with self.assertRaisesRegex(DatasetValidationError, "Missing required dataset file"):
            load_dataset(self.root, "test", allow_test=True)

    def test_test_split_uses_explicit_test_files_and_rejects_category_labels(self):
        test_root = self.root / "test"
        (self.root / "splits.json").write_text(
            json.dumps({"r_0001": "dev", "r_0002": "test"}), encoding="utf-8"
        )
        (test_root / "raw/resumes").mkdir(parents=True)
        (test_root / "raw/resumes/r_0002.txt").write_text("Alex Doe Python", encoding="utf-8")
        write_jsonl(test_root / "parser_test.jsonl", [{
            "id": "r_0002", "text": "Alex Doe Python", "entities": [],
        }])
        pair = {
            "pair_id": "p_test_1", "resume_id": "r_0002", "jd_id": "j_0001",
            "fit_score": 60, "fit_verdict": "moderate", "label_source": "human",
        }
        write_jsonl(test_root / "pairs_test.jsonl", [pair])
        dataset = load_dataset(self.root, "test", allow_test=True)
        self.assertEqual(dataset.split, "test")

        (test_root / "raw/resumes/r_0001.txt").write_text("dev data leaked into test", encoding="utf-8")
        with self.assertRaisesRegex(DatasetValidationError, "layout manifest"):
            load_dataset(self.root, "test", allow_test=True)
        (test_root / "raw/resumes/r_0001.txt").unlink()

        pair["label_source"] = "category"
        write_jsonl(test_root / "pairs_test.jsonl", [pair])
        with self.assertRaisesRegex(DatasetValidationError, "invalid label source"):
            load_dataset(self.root, "test", allow_test=True)

    def test_pair_resume_must_match_the_requested_frozen_split(self):
        (self.root / "splits.json").write_text(
            json.dumps({"r_0001": "train"}), encoding="utf-8"
        )
        with self.assertRaisesRegex(DatasetValidationError, "belongs to a different split"):
            load_dataset(self.root, "dev")

    def test_model_availability_does_not_substitute_silently(self):
        require_models_available(["keyword-baseline"], ["keyword-baseline"])
        with self.assertRaises(ModelUnavailableError):
            require_models_available(["hirelabs-evaluator"], ["gemini"])


if __name__ == "__main__":
    unittest.main()
