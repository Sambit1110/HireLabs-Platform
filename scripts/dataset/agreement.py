"""Exact character-span agreement between two independent Label Studio exports."""
import argparse
import csv
import json
import sys
from pathlib import Path

from annotations import LABELS


def load_export(path):
    documents = {}
    spans = set()
    for task in json.loads(path.read_text(encoding="utf-8")):
        rid, text = task["data"]["id"], task["data"]["text"]
        completed = [a for a in task["annotations"] if not a.get("was_cancelled")]
        if rid in documents or len(completed) != 1:
            raise ValueError(f"{rid}: expected one task and one completed annotation")
        documents[rid] = text
        for result in completed[0]["result"]:
            value = result["value"]
            label, = value["labels"]
            start, end = value["start"], value["end"]
            if label not in LABELS or not 0 <= start < end <= len(text) or text[start:end] != value["text"]:
                raise ValueError(f"{rid}: invalid span")
            spans.add((rid, start, end, label))
    if not documents:
        raise ValueError("Empty export")
    return documents, spans


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("first", type=Path)
    parser.add_argument("second", type=Path)
    args = parser.parse_args()
    docs_a, a = load_export(args.first)
    docs_b, b = load_export(args.second)
    if docs_a != docs_b:
        raise ValueError("Both annotators must label exactly the same IDs and texts")
    writer = csv.writer(sys.stdout)
    writer.writerow(["label", "annotator_a", "annotator_b", "exact_matches", "f1"])
    for label in [*sorted(LABELS), "overall"]:
        left = {s for s in a if label == "overall" or s[-1] == label}
        right = {s for s in b if label == "overall" or s[-1] == label}
        total = len(left) + len(right)
        hits = len(left & right)
        writer.writerow([label, len(left), len(right), hits, 2 * hits / total if total else "NA"])


if __name__ == "__main__":
    main()
