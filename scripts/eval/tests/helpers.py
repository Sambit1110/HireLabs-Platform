"""Small isolated prepared-layout fixtures for evaluation unit tests."""

import json
from pathlib import Path


def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")


def write_prepared_fixture(root):
    root = Path(root)
    manifest = {"r_train": "train", "r_dev": "dev", "r_test": "test"}
    (root / "splits.json").write_text(json.dumps(manifest), encoding="utf-8")
    for relative, text in (
        ("raw/resumes/r_train.txt", "Jane Doe Python"),
        ("raw/resumes/r_dev.txt", "Alex Doe Python"),
        ("test/raw/resumes/r_test.txt", "Sam Doe Python"),
        ("raw/jds/j1.txt", "Python engineer"),
    ):
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    for split, resume_id, text in (
        ("train", "r_train", "Jane Doe Python"),
        ("dev", "r_dev", "Alex Doe Python"),
        ("test", "r_test", "Sam Doe Python"),
    ):
        prefix = "test/" if split == "test" else ""
        parser_name = "parser_test.jsonl" if split == "test" else f"parser/{split}.jsonl"
        pairs_name = "pairs_test.jsonl" if split == "test" else f"pairs/{split}.jsonl"
        write_jsonl(root / prefix / parser_name, [{
            "id": resume_id,
            "text": text,
            "entities": [
                {"start": 0, "end": 8, "label": "NAME"},
                {"start": 9, "end": 15, "label": "SKILL"},
            ],
        }])
        write_jsonl(root / prefix / pairs_name, [{
            "pair_id": f"p_{split}", "resume_id": resume_id, "jd_id": "j1",
            "fit_score": 80, "fit_verdict": "strong", "label_source": "human",
        }])
    return root
