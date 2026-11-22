"""Convert an adjudicated Label Studio JSON export for one frozen split."""
import argparse
import json
from pathlib import Path

LABELS = {"NAME", "TITLE", "SKILL", "YEARS_EXPERIENCE", "DEGREE", "COMPANY"}


def convert(root, split, export):
    manifest = json.loads((root / "splits.json").read_text())
    prefix = root / "test" if split == "test" else root
    seen = set()
    rows = []
    for task in json.loads(export.read_text()):
        data = task["data"]
        rid = data["id"]
        if manifest.get(rid) != split or rid in seen:
            raise ValueError(f"Wrong split or repeated ID: {rid}")
        seen.add(rid)
        text = (prefix / "raw/resumes" / f"{rid}.txt").read_text()
        annotations = [a for a in task["annotations"] if not a.get("was_cancelled")]
        if len(annotations) != 1 or data["text"] != text:
            raise ValueError(f"Resolve annotations or text mismatch for {rid}")
        spans = []
        for result in annotations[0]["result"]:
            value = result["value"]
            label, = value["labels"]
            start, end = value["start"], value["end"]
            if label not in LABELS or not 0 <= start < end <= len(text) or text[start:end] != value["text"]:
                raise ValueError(f"Invalid span in {rid}")
            spans.append(dict(start=start, end=end, label=label))
        spans.sort(key=lambda s: s["start"])
        if any(a["end"] > b["start"] for a, b in zip(spans, spans[1:])):
            raise ValueError(f"Overlapping spans in {rid}")
        rows.append(dict(id=rid, text=text, entities=spans))
    if not rows:
        raise ValueError("Empty export")
    dest = prefix / ("parser_test.jsonl" if split == "test" else f"parser/{split}.jsonl")
    dest.parent.mkdir(exist_ok=True)
    if split != "test":
        import spacy
        from spacy.tokens import DocBin
        tokenizer = spacy.blank("en")
        corpus = DocBin()
        for row in rows:
            doc = tokenizer.make_doc(row["text"])
            entities = [doc.char_span(s["start"], s["end"], label=s["label"]) for s in row["entities"]]
            if None in entities:
                raise ValueError(f"Span cuts a token in {row['id']}")
            doc.ents = entities
            corpus.add(doc)
        corpus.to_disk(dest.with_suffix(".spacy"))
    dest.write_text("".join(json.dumps(row) + "\n" for row in rows))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", type=Path)
    parser.add_argument("split", choices=["train", "dev", "test"])
    parser.add_argument("export", type=Path)
    convert(**vars(parser.parse_args()))
