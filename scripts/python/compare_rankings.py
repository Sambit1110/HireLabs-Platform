#!/usr/bin/env python3
"""
HireLabs - Ranking Comparison Generator
Compares baseline BAAI/bge-small-en-v1.5 vs fine-tuned hirelabs-matcher
on 3 representative job descriptions.
"""

import json
import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from scripts.python.rank_resumes import rank_resumes_for_jd

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "samples")

CANDIDATE_NAMES = {
    "r_0001": "Priya Raman (Sr. Backend)",
    "r_0002": "Alex Chen (Sr. Frontend)",
    "r_0003": "Dr. Elena Rostova (Lead ML/NLP)",
    "r_0004": "Marcus Vance (Mobile Dev)",
    "r_0005": "Devon Miller (Jr. Web Dev)",
}

def load_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read().strip()

def run_comparison():
    resumes = {}
    for rid in CANDIDATE_NAMES.keys():
        fpath = os.path.join(DATA_DIR, "raw", "resumes", f"{rid}.txt")
        if os.path.exists(fpath):
            resumes[rid] = load_file(fpath)

    jobs = [
        ("Job 1: Senior Backend Engineer (Node.js/PostgreSQL)", "j_0001.txt"),
        ("Job 2: Senior Frontend Engineer (React/TypeScript/Next.js)", "j_0002.txt"),
        ("Job 3: Machine Learning Engineer (NLP/Semantic Search)", "j_0003.txt"),
    ]

    for title, fname in jobs:
        fpath = os.path.join(DATA_DIR, "raw", "jds", fname)
        jd_text = load_file(fpath)

        base_ranking = rank_resumes_for_jd(jd_text, resumes, model_path="BAAI/bge-small-en-v1.5", top_k=5)
        ft_ranking = rank_resumes_for_jd(jd_text, resumes, model_path="models/hirelabs-matcher", top_k=5)

        print(f"\n=======================================================")
        print(f"{title}")
        print(f"=======================================================")
        print(f"{'Rank':<5} | {'Baseline (BGE-small)':<32} | {'Fine-Tuned (hirelabs-matcher)':<32}")
        print(f"{'-'*5}-+-{'-'*32}-+-{'-'*32}")

        for i in range(len(base_ranking)):
            b = base_ranking[i]
            f = ft_ranking[i]
            b_str = f"{b['id']} ({b['similarity']:.4f}) {CANDIDATE_NAMES.get(b['id'], '')[:12]}"
            f_str = f"{f['id']} ({f['similarity']:.4f}) {CANDIDATE_NAMES.get(f['id'], '')[:12]}"
            print(f"#{i+1:<4} | {b_str:<32} | {f_str:<32}")

if __name__ == "__main__":
    run_comparison()
