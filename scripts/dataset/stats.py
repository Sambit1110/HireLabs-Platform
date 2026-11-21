"""Print dataset-card counts. Missing annotation or pair files produce null counts."""
import argparse
import json
from collections import Counter
from pathlib import Path

from annotations import LABELS


def rows(path):
    with path.open(encoding="utf-8") as stream:
        for line in stream:
            yield json.loads(line)


def summarize(root, split, manifest, jobs):
    test = split == "test"
    parser = root / ("test/parser_test.jsonl" if test else f"parser/{split}.jsonl")
    pairs = root / ("test/pairs_test.jsonl" if test else f"pairs/{split}.jsonl")
    ids = {rid for rid, group in manifest.items() if group == split}
    result = dict(resumes=len(ids), jobs_in_reviewed_pairs=None, labelled_resumes=None,
                  entities=None, pairs=None, label_source=None, fit_verdict=None)
    if parser.exists():
        labels = Counter(dict.fromkeys(sorted(LABELS), 0))
        seen = set()
        for row in rows(parser):
            rid = row["id"]
            if rid not in ids or rid in seen:
                raise ValueError(f"Unexpected or repeated parser record: {rid}")
            seen.add(rid)
            for entity in row["entities"]:
                label = entity["label"]
                if label not in LABELS:
                    raise ValueError(f"Unknown label: {label}")
                labels[label] += 1
        result.update(labelled_resumes=len(seen), entities=labels)
    if pairs.exists():
        used, seen = set(), set()
        sources = Counter(dict.fromkeys(["human", "gemini_checked", "category"], 0))
        verdicts = Counter(dict.fromkeys(["strong", "moderate", "weak", "insufficient_evidence"], 0))
        for row in rows(pairs):
            source, verdict = row["label_source"], row["fit_verdict"]
            if (row["resume_id"] not in ids or row["jd_id"] not in jobs or row["pair_id"] in seen
                    or source not in sources or verdict not in verdicts or (test and source == "category")):
                raise ValueError(f"Invalid pair: {row['pair_id']}")
            seen.add(row["pair_id"])
            used.add(row["jd_id"])
            sources[source] += 1
            verdicts[verdict] += 1
        result.update(jobs_in_reviewed_pairs=len(used), pairs=len(seen), label_source=sources, fit_verdict=verdicts)
    return result


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("root", type=Path)
    cli.add_argument("--include-test", action="store_true")
    args = cli.parse_args()
    manifest = json.loads((args.root / "splits.json").read_text(encoding="utf-8"))
    jobs = {p.stem for p in (args.root / "raw/jds").iterdir() if p.suffix == ".txt"}
    splits = ["train", "dev", "test"] if args.include_test else ["train", "dev"]
    print(json.dumps({"shared_job_pool": len(jobs), "splits": {
        split: summarize(args.root, split, manifest, jobs) for split in splits
    }}, indent=2))
