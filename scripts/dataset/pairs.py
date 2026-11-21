"""Validate a reviewed JSONL file against the frozen split."""
import argparse
import json
import re
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("root", type=Path)
parser.add_argument("split", choices=["train", "dev", "test"])
parser.add_argument("reviewed", type=Path)
args = parser.parse_args()
manifest = json.loads((args.root / "splits.json").read_text())
seen_ids, seen_pairs = set(), set()
rows = []
for line in args.reviewed.read_text().splitlines():
    row = json.loads(line)
    rid, jid = row["resume_id"], row["jd_id"]
    if manifest.get(rid) != args.split or not re.fullmatch(r"j_\d+", jid) or not (args.root / "raw/jds" / (jid+".txt")).is_file():
        raise ValueError("Unknown job or wrong resume split")
    if row["pair_id"] in seen_ids or (rid, jid) in seen_pairs:
        raise ValueError("Duplicate pair")
    seen_ids.add(row["pair_id"])
    seen_pairs.add((rid, jid))
    score = row["fit_score"]
    if type(score) is not int or not 0 <= score <= 100:
        raise ValueError("Invalid score")
    band = "strong" if score >= 75 else "moderate" if score >= 50 else "weak"
    if row["fit_verdict"] not in (band, "insufficient_evidence"):
        raise ValueError("Score and verdict disagree")
    sources = ["human", "gemini_checked"]
    if args.split != "test":
        sources.append("category")
    if row["label_source"] not in sources:
        raise ValueError("Invalid review source")
    rows.append(json.dumps(row))
dest = args.root / ("test/pairs_test.jsonl" if args.split == "test" else f"pairs/{args.split}.jsonl")
dest.parent.mkdir(exist_ok=True)
if not rows:
    raise ValueError("Empty review file")
dest.write_text("\n".join(rows) + "\n")
