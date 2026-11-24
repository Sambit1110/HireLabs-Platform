#!/usr/bin/env python3
"""
Compare embedding matchers on held-out dev resumes, with no score labels.

For every job, all dev resumes are ranked by cosine similarity; a resume is relevant when it
has the job's role. Four views, as in evaluate_llm.py: full text, title lines removed,
~35% of lines removed, and re-laid-out by rules. A required-skill overlap rule is reported too.

  python3 scripts/python/evaluate_matchers.py --data-dir /path/HireLabs-Data \\
      --model v2=models/hirelabs-matcher-v2 --model v1=models/hirelabs-matcher --output matchers.json
"""

import argparse
import json
import os
import random
import sys

import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from evaluate_llm import KS, skill_overlap, summarize  # noqa: E402
from hirelabs_llm.augment import relayout  # noqa: E402
from hirelabs_llm.corpus import Corpus, drop_lines, drop_title  # noqa: E402
from hirelabs_llm.encoder import ScratchMatcher, is_scratch_matcher  # noqa: E402
from matcher_metrics import ranking_metrics  # noqa: E402


def load_matcher(folder):
    if is_scratch_matcher(folder):
        return ScratchMatcher.load(folder)
    from sentence_transformers import SentenceTransformer  # the pretrained-based matcher (v1)

    return SentenceTransformer(folder, local_files_only=True, device="cpu")


def embed(matcher, texts):
    vectors = matcher.encode(list(texts), batch_size=32, normalize_embeddings=True, show_progress_bar=False)
    return torch.as_tensor(vectors)


def views(dev, seed):
    resume_ids, job_ids = sorted(dev.resumes), sorted(dev.pairable_jobs)
    shorten, relaid = random.Random(seed + 1), random.Random(seed + 2)
    return {
        "full": ({r: dev.resumes[r] for r in resume_ids}, {j: dev.jobs[j] for j in job_ids}),
        "title_blind": ({r: drop_title(dev.resumes[r]) for r in resume_ids}, {j: dev.jobs[j] for j in job_ids}),
        "shortened": ({r: drop_lines(dev.resumes[r], 0.35, shorten) for r in resume_ids},
                      {j: drop_lines(dev.jobs[j], 0.35, shorten) for j in job_ids}),
        "relaid": ({r: relayout(dev.resumes[r], relaid) for r in resume_ids},
                   {j: relayout(dev.jobs[j], relaid) for j in job_ids}),
    }


def evaluate(models, data_dir, seed=0, split="dev"):
    dev = Corpus(data_dir, split)
    resume_ids, job_ids = sorted(dev.resumes), sorted(dev.pairable_jobs)
    relevant = {j: {r for r in resume_ids if dev.resume_roles[r] == dev.job_roles[j]} for j in job_ids}
    results = {"dev_resumes": len(resume_ids), "jobs": len(job_ids), "relevance": "same role (no score labels)"}
    loaded = {name: load_matcher(folder) for name, folder in models.items()}
    for view, (resumes, jobs) in views(dev, seed).items():
        results[view] = {}
        for name, matcher in loaded.items():
            scores = embed(matcher, [jobs[j] for j in job_ids]) @ embed(matcher, [resumes[r] for r in resume_ids]).T
            rankings = {j: [resume_ids[i] for i in scores[n].argsort(descending=True).tolist()] for n, j in enumerate(job_ids)}
            results[view][name] = summarize(ranking_metrics(rankings, relevant, ks=KS))
        rule = {j: sorted(resume_ids, key=lambda r: -skill_overlap(jobs[j], resumes[r])) for j in job_ids}
        results[view]["skill_overlap_rule"] = summarize(ranking_metrics(rule, relevant, ks=KS))
    return results


def main():
    parser = argparse.ArgumentParser(description="Compare embedding matchers on held-out dev resumes.")
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--model", action="append", required=True, help="name=folder (repeatable)")
    parser.add_argument("--split", default="dev", help="Resume split to rank (dev, or extdev for the free-text test set)")
    parser.add_argument("--output")
    args = parser.parse_args()
    models = dict(item.split("=", 1) for item in args.model)
    text = json.dumps({"split": args.split, **evaluate(models, args.data_dir, split=args.split)}, indent=2)
    print(text)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            handle.write(text + "\n")


if __name__ == "__main__":
    main()
