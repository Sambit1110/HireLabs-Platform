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
import json
import os
import sys
from typing import Dict, List, Tuple
import numpy as np

# Add fallback sample directory
SAMPLE_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "samples")


def load_pairs(pairs_path: str) -> List[Dict]:
    pairs = []
    with open(pairs_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                pairs.append(json.loads(line))
    return pairs


def load_texts(raw_dir: str) -> Dict[str, str]:
    texts = {}
    if not os.path.exists(raw_dir):
        return texts
    for fname in os.listdir(raw_dir):
        if fname.endswith(".txt"):
            doc_id = os.path.splitext(fname)[0]
            with open(os.path.join(raw_dir, fname), "r", encoding="utf-8") as f:
                texts[doc_id] = f.read().strip()
    return texts


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

    if data_dir is None:
        data_dir = SAMPLE_DATA_DIR

    pairs_path = os.path.join(data_dir, "pairs", "dev.jsonl")
    resumes_dir = os.path.join(data_dir, "raw", "resumes")
    jds_dir = os.path.join(data_dir, "raw", "jds")

    print(f"Loading data from: {data_dir}")
    pairs = load_pairs(pairs_path)
    resumes = load_texts(resumes_dir)
    jds = load_texts(jds_dir)

    print(f"Found {len(pairs)} dev pairs, {len(resumes)} resumes, {len(jds)} job descriptions.")

    # Ground truth: positive pairs with fit_score >= 75
    ground_truth: Dict[str, List[str]] = {}
    for p in pairs:
        score = p.get("fit_score", 0)
        verdict = p.get("fit_verdict", "")
        if score >= 75 or verdict == "strong":
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
    for jd_id, jd_text in jds.items():
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
        "queries_count": len(jds),
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
    parser.add_argument("--data-dir", type=str, default=None, help="Path to data directory (contains pairs/ and raw/)")
    args = parser.parse_args()

    evaluate(args.model, args.data_dir)
