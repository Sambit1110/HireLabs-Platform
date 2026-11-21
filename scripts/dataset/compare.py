"""Print exact-span dev metrics; pass dataset root and both spaCy model paths."""
import json
import sys
from collections import Counter
from pathlib import Path

import spacy
from annotations import LABELS

root, trained, baseline = sys.argv[1:]
rows = [json.loads(line) for line in (Path(root) / "parser/dev.jsonl").read_text().splitlines()]
mapping = {"SKILLS": "SKILL", "DESIGNATION": "TITLE", "WORKED AS": "TITLE",
           "YEARS OF EXPERIENCE": "YEARS_EXPERIENCE", "COMPANIES WORKED AT": "COMPANY"}
print("model,label,gold,predicted,correct,precision,recall,f1")
for name, model in [("hirelabs-parser", trained), ("downloaded", baseline)]:
    nlp = spacy.load(model)
    totals = Counter()
    for row, doc in zip(rows, nlp.pipe(r["text"] for r in rows)):
        gold = {(s["start"], s["end"], s["label"]) for s in row["entities"]}
        pred = {(e.start_char, e.end_char, mapping.get(e.label_, e.label_)) for e in doc.ents}
        for group, spans in [("gold", gold), ("pred", pred), ("hit", gold & pred)]:
            totals.update((group, label) for _, _, label in spans)
    for label in sorted(LABELS):
        g, p, h = (totals[k, label] for k in ("gold", "pred", "hit"))
        print(name, label, g, p, h, h/p if p else 0, h/g if g else 0,
              2*h/(g+p) if g+p else 0, sep=",")
