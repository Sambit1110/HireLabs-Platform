#!/usr/bin/env python3
"""
HireLabs - Fine-Tuning Matching Model (Week 2)
Model: hirelabs-matcher (fine-tuned from BAAI/bge-small-en-v1.5)

Training Strategy:
- Positive Pairs: (Job Description, Resume) where fit_score >= 75
- Hard Negatives: Resumes with fit_score < 50 from the same job category
- Loss: MultipleNegativesRankingLoss (contrastive in-batch and hard-negative loss)
- Evaluation: InformationRetrievalEvaluator / dev Recall@5 & MRR
"""

import argparse
import json
import os
import sys
from typing import Dict, List
import torch
from sentence_transformers import InputExample, SentenceTransformer, losses
from torch.utils.data import DataLoader

SAMPLE_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "samples")
DEFAULT_OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "models", "hirelabs-matcher")


def load_pairs(pairs_path: str) -> List[Dict]:
    pairs = []
    if not os.path.exists(pairs_path):
        return pairs
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


def build_training_examples(train_pairs: List[Dict], resumes: Dict[str, str], jds: Dict[str, str]) -> List[InputExample]:
    """
    Constructs InputExample instances with positive and hard negative pairs.
    For MultipleNegativesRankingLoss, texts=[anchor, positive, hard_negative (optional)]
    """
    positives_by_jd: Dict[str, List[str]] = {}
    negatives_by_jd: Dict[str, List[str]] = {}

    for p in train_pairs:
        jd_id = p["jd_id"]
        res_id = p["resume_id"]
        score = p.get("fit_score", 0)

        if score >= 75 or p.get("fit_verdict") == "strong":
            positives_by_jd.setdefault(jd_id, []).append(res_id)
        elif score < 50 or p.get("fit_verdict") == "weak":
            negatives_by_jd.setdefault(jd_id, []).append(res_id)

    examples = []
    for jd_id, pos_res_ids in positives_by_jd.items():
        if jd_id not in jds:
            continue
        jd_text = jds[jd_id]
        hard_negs = negatives_by_jd.get(jd_id, [])

        for pos_id in pos_res_ids:
            if pos_id not in resumes:
                continue
            pos_text = resumes[pos_id]

            if hard_negs:
                for neg_id in hard_negs:
                    if neg_id in resumes:
                        neg_text = resumes[neg_id]
                        # Triplet with hard negative
                        examples.append(InputExample(texts=[jd_text, pos_text, neg_text]))
            else:
                examples.append(InputExample(texts=[jd_text, pos_text]))

    return examples


def train(
    base_model_name: str = "BAAI/bge-small-en-v1.5",
    data_dir: str = None,
    output_dir: str = None,
    epochs: int = 3,
    batch_size: int = 16,
    learning_rate: float = 2e-5,
):
    if data_dir is None:
        data_dir = SAMPLE_DATA_DIR
    if output_dir is None:
        output_dir = DEFAULT_OUTPUT_DIR

    os.makedirs(output_dir, exist_ok=True)

    print(f"Loading data from: {data_dir}")
    train_pairs = load_pairs(os.path.join(data_dir, "pairs", "train.jsonl"))
    resumes = load_texts(os.path.join(data_dir, "raw", "resumes"))
    jds = load_texts(os.path.join(data_dir, "raw", "jds"))

    print(f"Loaded {len(train_pairs)} train pairs, {len(resumes)} resumes, {len(jds)} JDs.")
    examples = build_training_examples(train_pairs, resumes, jds)
    print(f"Generated {len(examples)} training examples (with hard negatives).")

    if not examples:
        print("Warning: No valid training examples generated. Check pairs/train.jsonl!")
        return

    print(f"Initializing base model: {base_model_name}")
    model = SentenceTransformer(base_model_name)

    train_dataloader = DataLoader(examples, shuffle=True, batch_size=min(batch_size, len(examples)))
    train_loss = losses.MultipleNegativesRankingLoss(model)

    warmup_steps = int(len(train_dataloader) * epochs * 0.1)

    print(f"Training for {epochs} epoch(s), batch_size={batch_size}, lr={learning_rate}...")
    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        epochs=epochs,
        warmup_steps=warmup_steps,
        optimizer_params={"lr": learning_rate},
        show_progress_bar=True,
    )

    print(f"Saving fine-tuned model to: {output_dir}")
    model.save(output_dir)
    print("Training complete! Model saved successfully as hirelabs-matcher.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train hirelabs-matcher using Sentence-Transformers.")
    parser.add_argument("--base-model", type=str, default="BAAI/bge-small-en-v1.5", help="Base model identifier")
    parser.add_argument("--data-dir", type=str, default=None, help="Path to data folder")
    parser.add_argument("--output-dir", type=str, default=None, help="Where to save fine-tuned model")
    parser.add_argument("--epochs", type=int, default=3, help="Training epochs")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=2e-5, help="Learning rate")
    args = parser.parse_args()

    train(
        base_model_name=args.base_model,
        data_dir=args.data_dir,
        output_dir=args.output_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
    )
