#!/usr/bin/env python3
"""
HireLabs - Resume Ranking Module & CLI (Deliverable to Mayukh)

Provides ranking functionality for evaluation on held-out test sets
and comparison between baseline and fine-tuned matching models.

Usage:
  # CLI:
  python scripts/python/rank_resumes.py --jd data/samples/raw/jds/j_0001.txt --resumes data/samples/raw/resumes/

  # Python API:
  from rank_resumes import rank_resumes_for_jd
  ranked = rank_resumes_for_jd(jd_text, resumes_dict, model_path="models/hirelabs-matcher")
"""

import argparse
import json
import os
import sys
from typing import Dict, List, Optional, Tuple, Union
import numpy as np

DEFAULT_MODEL = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "models", "hirelabs-matcher")
FALLBACK_MODEL = "BAAI/bge-small-en-v1.5"

_LOADED_MODELS = {}


def get_model(model_name_or_path: str):
    from sentence_transformers import SentenceTransformer

    if model_name_or_path not in _LOADED_MODELS:
        # Check if local path exists, else fall back to base model
        resolved_path = model_name_or_path
        if not os.path.exists(resolved_path) and resolved_path == DEFAULT_MODEL:
            print(f"Notice: '{DEFAULT_MODEL}' not found yet. Using base model '{FALLBACK_MODEL}'...")
            resolved_path = FALLBACK_MODEL

        _LOADED_MODELS[model_name_or_path] = SentenceTransformer(resolved_path)
    return _LOADED_MODELS[model_name_or_path]


def rank_resumes_for_jd(
    jd_text: str,
    resumes: Union[Dict[str, str], List[Tuple[str, str]]],
    model_path: str = DEFAULT_MODEL,
    top_k: int = 10,
) -> List[Dict]:
    """
    Ranks a dictionary or list of (id, text) resumes against a job description.

    Returns:
      List of dicts: [
        {"rank": 1, "id": "r_0001", "similarity": 0.8842, "preview": "..."},
        ...
      ]
    """
    model = get_model(model_path)

    if isinstance(resumes, dict):
        resume_items = list(resumes.items())
    else:
        resume_items = resumes

    if not resume_items:
        return []

    resume_ids = [item[0] for item in resume_items]
    resume_texts = [item[1] for item in resume_items]

    # Prepend query instruction for BGE models if applicable
    query_text = (
        f"Represent this sentence for searching relevant passages: {jd_text.strip()}"
        if "bge" in str(model_path).lower()
        else jd_text.strip()
    )

    query_vec = model.encode([query_text], normalize_embeddings=True, show_progress_bar=False)[0]
    resume_vecs = model.encode(resume_texts, normalize_embeddings=True, show_progress_bar=False)

    # Cosine similarities (dot product since normalized)
    sims = np.dot(resume_vecs, query_vec)
    ranked_order = np.argsort(-sims)

    results = []
    for rank_idx, doc_idx in enumerate(ranked_order[:top_k], start=1):
        rid = resume_ids[doc_idx]
        text_preview = resume_texts[doc_idx][:160].replace("\n", " ").strip() + "..."
        score = float(sims[doc_idx])
        results.append({
            "rank": rank_idx,
            "id": rid,
            "similarity": round(score, 4),
            "preview": text_preview
        })

    return results


def main():
    parser = argparse.ArgumentParser(description="Rank resumes against a job description.")
    parser.add_argument("--jd", type=str, required=True, help="Path to JD text file or literal text")
    parser.add_argument("--resumes", type=str, required=True, help="Path to directory containing resume .txt files")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Model path or HuggingFace ID")
    parser.add_argument("--top-k", type=int, default=5, help="Number of top resumes to display")
    parser.add_argument("--json", action="store_true", help="Output pure JSON")
    args = parser.parse_args()

    # Load JD
    if os.path.isfile(args.jd):
        with open(args.jd, "r", encoding="utf-8") as f:
            jd_text = f.read().strip()
    else:
        jd_text = args.jd

    # Load Resumes
    resumes_dict = {}
    if os.path.isdir(args.resumes):
        for fname in os.listdir(args.resumes):
            if fname.endswith(".txt"):
                rid = os.path.splitext(fname)[0]
                with open(os.path.join(args.resumes, fname), "r", encoding="utf-8") as f:
                    resumes_dict[rid] = f.read().strip()
    else:
        print(f"Error: resumes path '{args.resumes}' must be a directory.")
        sys.exit(1)

    ranked = rank_resumes_for_jd(jd_text, resumes_dict, model_path=args.model, top_k=args.top_k)

    if args.json:
        print(json.dumps(ranked, indent=2))
    else:
        print(f"\nTop {len(ranked)} Resumes for Job Description:\n" + "=" * 50)
        for r in ranked:
            print(f"Rank {r['rank']} | ID: {r['id']} | Similarity: {r['similarity']:.4f}")
            print(f"   Preview: {r['preview']}\n")


if __name__ == "__main__":
    main()
