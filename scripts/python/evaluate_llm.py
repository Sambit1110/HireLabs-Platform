#!/usr/bin/env python3
"""
Evaluate hirelabs-llm on held-out dev resumes, with no score labels.

For every job, all dev resumes (never seen in training) are ranked by the model's match score.
A resume counts as relevant when it has the job's role. Reported three ways:
  - full: resumes as written
  - title-blind: lines naming the resume's role removed, so the model must match on skills
  - shortened: about a third of the lines of every job and resume removed at random, a rough
    stand-in for text that does not follow the dataset's template
  - relaid: every job and resume re-laid-out by rules (augment.py), another stand-in for
    other layouts
Two baselines use the same rankings: required-skill overlap (a text rule) and random order.

  python3 scripts/python/evaluate_llm.py --model models/hirelabs-llm --data-dir /path/HireLabs-Data --output llm-dev.json
"""

import argparse
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hirelabs_llm.augment import relayout  # noqa: E402
from hirelabs_llm.corpus import Corpus, drop_lines, drop_title  # noqa: E402
from hirelabs_llm.score import SKILL_LINE, Scorer  # noqa: E402
from matcher_metrics import ranking_metrics  # noqa: E402

KS = (1, 5, 10)


def skill_overlap(job_text, resume_text):
    match = SKILL_LINE.search(job_text)
    if not match:
        return 0.0
    skills = [s.strip().lower() for s in match.group(2).split(",") if s.strip()]
    resume = resume_text.lower()
    return sum(s in resume for s in skills) / max(1, len(skills))


def summarize(metrics):
    return {key: round(metrics[key], 4) for key in ("mrr", *(f"recall_at_{k}" for k in KS))} | {"queries": metrics["queries"]}


def evaluate(model_dir, data_dir, device="auto", max_jobs=None, seed=0, split="dev"):
    scorer = Scorer.load(model_dir, device=device)
    dev = Corpus(data_dir, split)
    job_ids = sorted(dev.pairable_jobs)
    if max_jobs:
        job_ids = random.Random(seed).sample(job_ids, min(max_jobs, len(job_ids)))
    resume_ids = sorted(dev.resumes)
    relevant = {jid: {rid for rid in resume_ids if dev.resume_roles[rid] == dev.job_roles[jid]} for jid in job_ids}
    shorten = random.Random(seed + 1)
    views = {"full": ({rid: dev.resumes[rid] for rid in resume_ids}, dev.jobs),
             "title_blind": ({rid: drop_title(dev.resumes[rid]) for rid in resume_ids}, dev.jobs),
             "shortened": ({rid: drop_lines(dev.resumes[rid], 0.35, shorten) for rid in resume_ids},
                           {jid: drop_lines(dev.jobs[jid], 0.35, shorten) for jid in sorted(dev.jobs)})}
    relaid = random.Random(seed + 2)
    views["relaid"] = ({rid: relayout(dev.resumes[rid], relaid) for rid in resume_ids},
                       {jid: relayout(dev.jobs[jid], relaid) for jid in sorted(dev.jobs)})

    results = {"model": os.path.basename(os.path.abspath(model_dir)),
               "data_dir": os.path.basename(os.path.abspath(data_dir)),
               "dev_resumes": len(resume_ids), "jobs": len(job_ids),
               "relevance": "resume role == job role (from the documents; no score labels)"}
    rng = random.Random(seed)
    for view, (texts, jobs) in views.items():
        llm, overlap, chance = {}, {}, {}
        for n, jid in enumerate(job_ids, 1):
            scores = scorer.pmi(jobs[jid], [texts[rid] for rid in resume_ids])
            llm[jid] = [rid for _, rid in sorted(zip(scores, resume_ids), key=lambda pair: -pair[0])]
            rule = [skill_overlap(jobs[jid], texts[rid]) for rid in resume_ids]
            # Shuffle first so ties in the rule are broken at random, not by id.
            order = resume_ids[:]
            rng.shuffle(order)
            by_rule = dict(zip(resume_ids, rule))
            overlap[jid] = sorted(order, key=lambda rid: -by_rule[rid])
            chance[jid] = rng.sample(resume_ids, len(resume_ids))
            if n % 50 == 0:
                print(f"  {view}: {n}/{len(job_ids)} jobs", flush=True)
        results[view] = {
            "hirelabs_llm": summarize(ranking_metrics(llm, relevant, ks=KS)),
            "skill_overlap_rule": summarize(ranking_metrics(overlap, relevant, ks=KS)),
            "random": summarize(ranking_metrics(chance, relevant, ks=KS)),
        }
    return results


def main():
    parser = argparse.ArgumentParser(description="Evaluate hirelabs-llm on held-out dev resumes.")
    parser.add_argument("--model", required=True, help="Folder written by train_llm.py")
    parser.add_argument("--data-dir", required=True, help="HireLabs-Data folder (raw/, splits.json)")
    parser.add_argument("--device", default="auto")
    parser.add_argument("--max-jobs", type=int, help="Evaluate on a random subset of jobs (faster)")
    parser.add_argument("--split", default="dev", help="Resume split to rank (dev, or extdev for the free-text test set)")
    parser.add_argument("--output", help="Write the results JSON here")
    args = parser.parse_args()
    result = evaluate(args.model, args.data_dir, args.device, args.max_jobs, split=args.split)
    result["split"] = args.split
    text = json.dumps(result, indent=2)
    print(text)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            handle.write(text + "\n")


if __name__ == "__main__":
    main()
