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
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timezone
import json
import os
import sys
from typing import Dict, List
from sentence_transformers import InputExample, SentenceTransformer, losses
from sentence_transformers.datasets import NoDuplicatesDataLoader
from torch.utils.data import DataLoader
from matcher_data import DatasetValidationError, load_texts, validate_dataset

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_OUTPUT_DIR = os.path.join(PROJECT_ROOT, "models", "hirelabs-matcher-candidate")


MODEL_CARD = """# hirelabs-matcher

384-dimensional sentence embedding model for HireLabs resume-job matching, fine-tuned from
`{base_model}` with MultipleNegativesRankingLoss on (job description, good resume, weak resume)
examples ({examples} examples, {epochs} epochs). Load it with
`SentenceTransformer("path/to/hirelabs-matcher")` and normalize embeddings; cosine similarity ranks resumes.

Private: trained on HireLabs resume data. Do not publish. Evaluation and limitations are in the
HireLabs report, section 4.
"""


class TeeStream:
    """Mirror Python output to the terminal and a persistent training log."""

    def __init__(self, *streams):
        self.streams = streams

    def write(self, value):
        for stream in self.streams:
            stream.write(value)
        return len(value)

    def flush(self):
        for stream in self.streams:
            stream.flush()

    def isatty(self):
        return any(getattr(stream, "isatty", lambda: False)() for stream in self.streams)

    @property
    def encoding(self):
        return self.streams[0].encoding


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
        verdict = p["fit_verdict"]
        if verdict == "strong":
            positives_by_jd.setdefault(jd_id, []).append(res_id)
        elif verdict == "weak":
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
    if not data_dir:
        raise DatasetValidationError("Pass --data-dir pointing to the approved dataset directory")
    if output_dir is None:
        output_dir = DEFAULT_OUTPUT_DIR

    train_pairs, _dev_pairs, data_manifest = validate_dataset(data_dir)
    if os.path.exists(output_dir) and not os.path.isdir(output_dir):
        raise DatasetValidationError(f"Output path is not a directory: {output_dir}")
    if os.path.isdir(output_dir) and os.listdir(output_dir):
        raise DatasetValidationError(
            f"Output directory already contains files: {output_dir}. Choose a fresh path to preserve prior artifacts."
        )

    os.makedirs(output_dir, exist_ok=True)
    log_path = os.path.join(output_dir, "training.log")
    with open(log_path, "w", encoding="utf-8") as training_log:
        output_stream = TeeStream(sys.stdout, training_log)
        error_stream = TeeStream(sys.stderr, training_log)
        with redirect_stdout(output_stream), redirect_stderr(error_stream):
            _run_training(
                train_pairs=train_pairs,
                data_manifest=data_manifest,
                data_dir=data_dir,
                output_dir=output_dir,
                base_model_name=base_model_name,
                epochs=epochs,
                batch_size=batch_size,
                learning_rate=learning_rate,
            )


def _run_training(
    train_pairs: List[Dict],
    data_manifest: Dict,
    data_dir: str,
    output_dir: str,
    base_model_name: str,
    epochs: int,
    batch_size: int,
    learning_rate: float,
) -> None:
    print(f"Loading data from: {os.path.basename(os.path.abspath(data_dir))}")
    resumes = load_texts(os.path.join(data_dir, "raw", "resumes"))
    jds = load_texts(os.path.join(data_dir, "raw", "jds"))

    print(f"Loaded {len(train_pairs)} train pairs, {len(resumes)} resumes, {len(jds)} JDs.")
    examples = build_training_examples(train_pairs, resumes, jds)
    print(f"Generated {len(examples)} training examples (with hard negatives).")

    if not examples:
        raise DatasetValidationError("No training examples generated from the validated train split")

    print(f"Initializing base model: {base_model_name}")
    model = SentenceTransformer(base_model_name)

    # The same job description appears in many examples. A batch must not hold it twice, or
    # MultipleNegativesRankingLoss treats one of its good resumes as a wrong answer.
    distinct_anchors = len({example.texts[0] for example in examples})
    if distinct_anchors >= 2 * batch_size:
        # Enough different job descriptions: use in-batch negatives, never two copies of a text in one batch.
        effective_batch = min(batch_size, len(examples))
        train_dataloader = NoDuplicatesDataLoader(examples, batch_size=effective_batch)
    else:
        # Few job descriptions: other examples in a batch would mostly be the same job, whose good
        # resumes must not count as wrong answers (and the no-duplicates loader can stall). Train one
        # (job, good resume, weak resume) example at a time instead.
        effective_batch = 1
        train_dataloader = DataLoader(examples, shuffle=True, batch_size=1)
    print(f"Batch size {effective_batch} ({distinct_anchors} distinct job descriptions).")
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
    # No auto-generated model card: it embeds training examples, which here are resume text.
    model.save(output_dir, create_model_card=False)
    with open(os.path.join(output_dir, "README.md"), "w", encoding="utf-8") as card:
        card.write(MODEL_CARD.format(base_model=base_model_name, epochs=epochs, examples=len(examples)))
    run_metadata = {
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "base_model": base_model_name,
        "data": data_manifest,
        "parameters": {
            "epochs": epochs,
            "batch_size": batch_size,
            "effective_batch_size": effective_batch,
            "learning_rate": learning_rate,
            "training_examples": len(examples),
        },
    }
    with open(os.path.join(output_dir, "training_run.json"), "w", encoding="utf-8") as metadata_file:
        json.dump(run_metadata, metadata_file, indent=2)
        metadata_file.write("\n")
    print("Training complete! Model saved successfully as hirelabs-matcher.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train hirelabs-matcher using Sentence-Transformers.")
    parser.add_argument("--base-model", type=str, default="BAAI/bge-small-en-v1.5", help="Base model identifier")
    parser.add_argument("--data-dir", type=str, required=True, help="Approved dataset directory (contains pairs/ and raw/)")
    parser.add_argument("--output-dir", type=str, default=None, help="Where to save fine-tuned model")
    parser.add_argument("--epochs", type=int, default=3, help="Training epochs")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=2e-5, help="Learning rate")
    args = parser.parse_args()

    try:
        train(
            base_model_name=args.base_model,
            data_dir=args.data_dir,
            output_dir=args.output_dir,
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.lr,
        )
    except DatasetValidationError as error:
        parser.error(str(error))
