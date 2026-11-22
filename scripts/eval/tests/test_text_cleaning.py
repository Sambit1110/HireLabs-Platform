import json
from pathlib import Path
import tempfile
import unittest

from scripts.eval.loader import load_dataset
from scripts.eval.text_cleaning import clean_text


class TextCleaningTests(unittest.TestCase):
    def test_cleaning_matches_documented_application_style_for_non_span_text(self):
        source = "  Cafe\u0301\u00a0resume\r\n\r\n\r\n\u2022  Python\u200b  "
        self.assertEqual(clean_text(source), "Café resume\n\n- Python")
        self.assertEqual(clean_text(source, 0), "")
        self.assertEqual(clean_text(None), "")

    def test_parser_loader_preserves_original_annotated_text_offsets(self):
        text = "  Jane Doe\nPython  "
        self.assertEqual(text[2:10], "Jane Doe")
        self.assertEqual(clean_text(text), "Jane Doe\nPython")
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "raw/resumes").mkdir(parents=True)
            (root / "raw/jds").mkdir(parents=True)
            (root / "splits.json").write_text(json.dumps({"r1": "dev"}), encoding="utf-8")
            (root / "raw/resumes/r1.txt").write_text(text, encoding="utf-8")
            (root / "raw/jds/j1.txt").write_text("Backend role", encoding="utf-8")
            (root / "parser").mkdir()
            (root / "pairs").mkdir()
            parser_row = {
                "id": "r1", "text": text,
                "entities": [{"start": 2, "end": 10, "label": "NAME"}],
            }
            pair_row = {
                "pair_id": "p1", "resume_id": "r1", "jd_id": "j1",
                "fit_score": 50, "fit_verdict": "moderate", "label_source": "human",
            }
            (root / "parser/dev.jsonl").write_text(json.dumps(parser_row) + "\n", encoding="utf-8")
            (root / "pairs/dev.jsonl").write_text(json.dumps(pair_row) + "\n", encoding="utf-8")
            dataset = load_dataset(root, "dev")
            # Exact-span metrics receive the untouched annotated text.
            self.assertEqual(dataset.parser_rows[0]["text"], text)
            self.assertEqual(dataset.parser_rows[0]["text"][2:10], "Jane Doe")


if __name__ == "__main__":
    unittest.main()
