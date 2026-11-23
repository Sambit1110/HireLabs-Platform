#!/usr/bin/env python3
"""
Evaluate an embedding model as the HireLabs matcher on the dev split, the way the app uses it.

- Pool: every dev-split resume (splits.json), not just the judged ones, so Recall@k means something.
- Relevant: dev pairs with fit_verdict "strong" for that job description. Unjudged resumes count as
  not relevant, which can only understate the score.
- Texts: the job description and resumes exactly as stored, with no query prefix, because the model
  server's /embed sends raw text.
- Also reports, per job description, the Spearman correlation between the model's similarity and the
  human fit_score over the judged dev resumes.

Usage:
  python scripts/python/evaluate_matcher.py --model BAAI/bge-small-en-v1.5 --data-dir /path/HireLabs-Data --output base.json
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone

from matcher_data import load_texts, validate_dataset
from matcher_metrics import mean_spearman, ranking_metrics


def evaluate(model_path: str, data_dir: str) -> dict:
    from sentence_transformers import SentenceTransformer

    _train, dev_pairs, manifest = validate_dataset(data_dir)
    with open(os.path.join(data_dir, "splits.json"), encoding="utf-8") as handle:
        splits = json.load(handle)
    resumes = load_texts(os.path.join(data_dir, "raw", "resumes"))
    jds = load_texts(os.path.join(data_dir, "raw", "jds"))

    pool = sorted(rid for rid, split in splits.items() if split == "dev" and rid in resumes)
    queries = sorted({pair["jd_id"] for pair in dev_pairs})
    relevant = {jd: {p["resume_id"] for p in dev_pairs if p["jd_id"] == jd and p["fit_verdict"] == "strong"} for jd in queries}

    model = SentenceTransformer(model_path)
    if model.get_sentence_embedding_dimension() != 384:
        raise ValueError("Expected a 384-dimensional model.")
    resume_vectors = model.encode([resumes[rid] for rid in pool], normalize_embeddings=True, show_progress_bar=False)
    query_vectors = model.encode([jds[jd] for jd in queries], normalize_embeddings=True, show_progress_bar=False)

    index = {rid: position for position, rid in enumerate(pool)}
    rankings, judged = {}, {}
    for qi, jd in enumerate(queries):
        scores = resume_vectors @ query_vectors[qi]
        rankings[jd] = [pool[i] for i in sorted(range(len(pool)), key=lambda i: (-float(scores[i]), pool[i]))]
        rows = [p for p in dev_pairs if p["jd_id"] == jd and p["resume_id"] in index]
        judged[jd] = ([p["fit_score"] for p in rows], [float(scores[index[p["resume_id"]]]) for p in rows])

    return {
        "model": model_path,
        "evaluated_at_utc": datetime.now(timezone.utc).isoformat(),
        "pool": {"split": "dev", "resumes": len(pool), "job_descriptions": len(queries),
                 "relevant_pairs": sum(len(v) for v in relevant.values()), "judged_pairs": len(dev_pairs)},
        "retrieval": ranking_metrics(rankings, relevant, ks=(5, 10, 20)),
        "judged_spearman": mean_spearman(judged),
        "data": manifest,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("--model", required=True, help="Hugging Face model ID or local folder")
    parser.add_argument("--data-dir", required=True, help="HireLabs-Data folder (pairs/, raw/, splits.json)")
    parser.add_argument("--output", help="Write the aggregate results JSON here")
    args = parser.parse_args()
    result = evaluate(args.model, args.data_dir)
    summary = {k: result["retrieval"][k] for k in ("queries", "recall_at_5", "recall_at_10", "recall_at_20", "mrr")}
    summary["judged_spearman_mean"] = result["judged_spearman"]["mean"]
    print(json.dumps(summary, indent=2))
    if args.output:
        with open(args.output, "x", encoding="utf-8") as handle:
            json.dump(result, handle, indent=2)
            handle.write("\n")
    sys.exit(0)
