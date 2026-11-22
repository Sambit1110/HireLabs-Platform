#!/usr/bin/env python3
"""
HireLabs - Baseline Matching Model Evaluation (Week 1)
Evaluates off-the-shelf BAAI/bge-small-en-v1.5 (384-dimensional embeddings)
on resume-job description pairs to establish the baseline Recall@5 and MRR.

Metrics:
- Recall@5: Percentage of job descriptions where a truly matching resume
            (fit_score >= 75 / fit_verdict == 'strong') is ranked in the top 5.
- MRR (Mean Reciprocal Rank): Mean of 1 / rank of the first relevant resume.
"""

import argparse
import os
from typing import Dict, List, Tuple
import numpy as np
from matcher_data import DatasetValidationError, load_texts, validate_dataset


def compute_metrics(
    rankings: Dict[str, List[str]],
    ground_truth: Dict[str, List[str]],
    k: int = 5
) -> Tuple[float, float]:
    """
    Computes Recall@k and MRR across all queries.
    """
    recalls = []
    reciprocal_ranks = []

    for qid, ranked_doc_ids in rankings.items():
        relevant = set(ground_truth.get(qid, []))
        if not relevant:
            continue

        # Recall@k
        top_k = ranked_doc_ids[:k]
        hit_at_k = any(doc_id in relevant for doc_id in top_k)
        recalls.append(1.0 if hit_at_k else 0.0)

        # MRR
        rr = 0.0
        for rank_idx, doc_id in enumerate(ranked_doc_ids, start=1):
            if doc_id in relevant:
                rr = 1.0 / rank_idx
                break
        reciprocal_ranks.append(rr)

    mean_recall = float(np.mean(recalls)) if recalls else 0.0
    mrr = float(np.mean(reciprocal_ranks)) if reciprocal_ranks else 0.0
    return mean_recall, mrr


def evaluate(
    model_name_or_path: str = "BAAI/bge-small-en-v1.5",
    data_dir: str = None
) -> Dict[str, float]:
    from sentence_transformers import SentenceTransformer

    if not data_dir:
        raise DatasetValidationError("Pass --data-dir pointing to the approved dataset directory")

    _train_pairs, pairs, data_manifest = validate_dataset(data_dir)
    resumes_dir = os.path.join(data_dir, "raw", "resumes")
    jds_dir = os.path.join(data_dir, "raw", "jds")

    print(f"Loading data from: {data_dir}")
    resumes = load_texts(resumes_dir)
    jds = load_texts(jds_dir)

    print(f"Found {len(pairs)} dev pairs, {len(resumes)} resumes, {len(jds)} job descriptions.")
    print("Validated input files and checksums:")
    for filename, details in data_manifest["files"].items():
        print(f"  {filename}: {details['rows']} rows, SHA-256 {details['sha256']}")

    # Ground truth: validated strong-fit pairs.
    ground_truth: Dict[str, List[str]] = {}
    for p in pairs:
        if p["fit_verdict"] == "strong":
            ground_truth.setdefault(p["jd_id"], []).append(p["resume_id"])

    # Load model
    print(f"Loading embedding model: {model_name_or_path}")
    model = SentenceTransformer(model_name_or_path)

    # Embed all resumes
    resume_ids = list(resumes.keys())
    resume_texts = [resumes[rid] for rid in resume_ids]
    print(f"Embedding {len(resume_ids)} candidate resumes...")
    resume_embeddings = model.encode(resume_texts, normalize_embeddings=True, show_progress_bar=False)

    # Embed queries and rank
    rankings: Dict[str, List[str]] = {}
    for jd_id in sorted(ground_truth):
        jd_text = jds[jd_id]
        # Instruction prefix for BGE retrieval queries if needed
        query_text = f"Represent this sentence for searching relevant passages: {jd_text}" if "bge" in model_name_or_path.lower() else jd_text
        query_embedding = model.encode([query_text], normalize_embeddings=True, show_progress_bar=False)[0]

        # Cosine similarity: dot product of normalized embeddings
        similarities = np.dot(resume_embeddings, query_embedding)
        sorted_indices = np.argsort(-similarities)
        rankings[jd_id] = [resume_ids[idx] for idx in sorted_indices]

    recall_at_5, mrr = compute_metrics(rankings, ground_truth, k=5)

    results = {
        "model": model_name_or_path,
        "queries_count": len(rankings),
        "resumes_count": len(resumes),
        "recall_at_5": round(recall_at_5, 4),
        "mrr": round(mrr, 4)
    }

    print("\n--- Evaluation Results ---")
    print(f"Model: {results['model']}")
    print(f"Recall@5: {results['recall_at_5'] * 100:.2f}%")
    print(f"MRR:      {results['mrr']:.4f}")
    print("--------------------------\n")
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate baseline or fine-tuned matcher on dev pairs.")
    parser.add_argument("--model", type=str, default="BAAI/bge-small-en-v1.5", help="Hugging Face model ID or local path")
    parser.add_argument("--data-dir", type=str, required=True, help="Approved dataset directory (contains pairs/ and raw/)")
    args = parser.parse_args()

    try:
        evaluate(args.model, args.data_dir)
    except DatasetValidationError as error:
        parser.error(str(error))
