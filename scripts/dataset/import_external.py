#!/usr/bin/env python3
"""
Merge public resume and job datasets into a copy of HireLabs-Data, in the layout the training
code reads (raw/resumes/*.txt, raw/jds/*.txt, splits.json).

Sources (both labelled Apache-2.0 on Hugging Face; original provenance not stated, see the
dataset card):
  - Unknown92/Resume_dataset, UpdatedResumeDataSet.csv: real free-text resumes with a category
  - minemaster01/job_desc, data/train-00000-of-00001.parquet: real job postings with a title
    (the AI-written `model_response` column is ignored)

Each document's first line is its role, which is how jobs and resumes are paired: a resume's
category, and for a job the category its title clearly maps to (else its own title). Exact
duplicate resumes are removed. 20% of the new resumes per category are held out as split
"extdev": a free-text test set. The team's own splits are copied unchanged.

  python3 -I scripts/dataset/import_external.py --team /path/HireLabs-Data \\
      --resumes UpdatedResumeDataSet.csv --jobs train-00000-of-00001.parquet --out /path/HireLabs-Data-plus
"""

import argparse
import json
import random
import re
import shutil
from pathlib import Path

import pandas as pd

# Job title keywords -> resume category (first match wins; checked on the lower-cased title).
TITLE_TO_CATEGORY = [
    (r"\bautomation test|\bsdet\b", "Automation Testing"),
    (r"\bqa\b|\btest(er|ing)?\b|quality assurance", "Testing"),
    (r"\bjava\b(?!script)", "Java Developer"),
    (r"\bpython\b", "Python Developer"),
    (r"\.net\b|\bdotnet\b|\bc#", "DotNet Developer"),
    (r"devops|site reliability|\bsre\b|cloud engineer", "DevOps Engineer"),
    (r"web design|ui designer|ux designer|web developer|front ?end", "Web Designing"),
    (r"\bhr\b|human resources|recruit|talent acquisition", "HR"),
    (r"hadoop|big data|spark", "Hadoop"),
    (r"blockchain|web3|solidity", "Blockchain"),
    (r"\betl\b|data engineer", "ETL Developer"),
    (r"operations manager|operations director|\boperations\b", "Operations Manager"),
    (r"data scien|machine learning|\bml\b|\bai engineer", "Data Science"),
    (r"sales|account executive|business development", "Sales"),
    (r"mechanical", "Mechanical Engineer"),
    (r"electrical", "Electrical Engineering"),
    (r"civil engineer", "Civil Engineer"),
    (r"database|\bdba\b|sql developer", "Database"),
    (r"fitness|personal trainer|nutrition|health coach", "Health and fitness"),
    (r"project manager|program manager|\bpmo\b", "PMO"),
    (r"business analyst", "Business Analyst"),
    (r"network|security engineer|cyber ?security", "Network Security Engineer"),
    (r"\bsap\b", "SAP Developer"),
    (r"lawyer|attorney|paralegal|legal|advocate", "Advocate"),
    (r"artist|illustrator|graphic design|art director", "Arts"),
]


def fix_text(text: str) -> str:
    """Repair UTF-8 read as Latin-1 ("â¢" -> "•") and tidy whitespace, keeping line breaks."""
    if "â" in text or "Ã" in text:
        try:
            text = text.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            text = text.replace("â¢", "•").replace("â", "'").replace("â", "-")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [re.sub(r"[ \t ]+", " ", line).strip() for line in text.split("\n")]
    return "\n".join(line for line in lines if line)


def category_for(title: str):
    lower = title.lower()
    return next((category for pattern, category in TITLE_TO_CATEGORY if re.search(pattern, lower)), None)


def main():
    parser = argparse.ArgumentParser(description="Merge public resume/job datasets into a copy of HireLabs-Data.")
    parser.add_argument("--team", required=True, help="HireLabs-Data folder (copied, never modified)")
    parser.add_argument("--resumes", required=True, help="UpdatedResumeDataSet.csv")
    parser.add_argument("--jobs", required=True, help="job_desc parquet")
    parser.add_argument("--out", required=True, help="New folder for the merged dataset")
    parser.add_argument("--holdout", type=float, default=0.2)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()

    team, out = Path(args.team), Path(args.out)
    if out.exists():
        raise SystemExit(f"{out} already exists: choose a new folder.")
    (out / "raw").mkdir(parents=True)
    shutil.copytree(team / "raw" / "resumes", out / "raw" / "resumes")
    shutil.copytree(team / "raw" / "jds", out / "raw" / "jds")
    splits = json.loads((team / "splits.json").read_text(encoding="utf-8"))

    rng = random.Random(args.seed)
    resumes = pd.read_csv(args.resumes)
    seen, by_category = set(), {}
    for category, raw in zip(resumes["Category"], resumes["Resume"]):
        text = fix_text(str(raw))
        key = re.sub(r"\W+", "", text.lower())
        if len(text) < 200 or key in seen:
            continue
        seen.add(key)
        by_category.setdefault(str(category).strip(), []).append(text)

    counts = {"resumes": 0, "extdev": 0, "jobs": 0, "jobs_mapped": 0}
    n = 0
    for category, texts in sorted(by_category.items()):
        rng.shuffle(texts)
        held = max(1, round(len(texts) * args.holdout)) if len(texts) > 1 else 0
        for index, text in enumerate(texts):
            n += 1
            rid = f"x_{n:04d}"
            (out / "raw" / "resumes" / f"{rid}.txt").write_text(f"{category}\n{text}\n", encoding="utf-8")
            splits[rid] = "extdev" if index < held else "train"
            counts["resumes"] += 1
            counts["extdev"] += index < held

    jobs = pd.read_parquet(args.jobs, columns=["position_title", "job_description"])
    for index, (title, description) in enumerate(zip(jobs["position_title"], jobs["job_description"]), start=1):
        title, description = str(title).strip(), fix_text(str(description))
        if not title or len(description) < 200:
            continue
        category = category_for(title)
        first = category or title
        (out / "raw" / "jds" / f"xj_{index:04d}.txt").write_text(f"{first}\n{title}\n{description}\n", encoding="utf-8")
        counts["jobs"] += 1
        counts["jobs_mapped"] += bool(category)

    (out / "splits.json").write_text(json.dumps(splits, indent=1), encoding="utf-8")
    (out / "SOURCES.md").write_text(
        "Merged copy of HireLabs-Data plus public datasets (see scripts/dataset/import_external.py):\n"
        "- Unknown92/Resume_dataset (UpdatedResumeDataSet.csv), Apache-2.0 per the Hugging Face card, provenance not stated\n"
        "- minemaster01/job_desc (data/train-00000-of-00001.parquet), Apache-2.0 per the card, provenance not stated; model_response column not used\n"
        f"Counts: {json.dumps(counts)}\n", encoding="utf-8")
    print(json.dumps({**counts, "categories": len(by_category)}, indent=2))


if __name__ == "__main__":
    main()
