#!/usr/bin/env python3
"""
Train hirelabs-llm from scratch: tokenizer, then a small GPT, then the 0-100 score curve.

No pretrained weights, no fine-tuning, no labels (human or Gemini). Training uses the raw
text of train-split resumes plus the shared job pool; dev resumes are kept out for
evaluate_llm.py. See docs/hirelabs-llm.md.

  python3 scripts/python/train_llm.py --data-dir /path/HireLabs-Data
  python3 scripts/python/train_llm.py --data-dir /path/HireLabs-Data --steps 200   # quick smoke run
"""

import argparse
import json
import math
import os
import random
import sys
import time

import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hirelabs_llm.corpus import Corpus, SequenceSampler, drop_lines, drop_title  # noqa: E402
from hirelabs_llm.model import GPT, GPTConfig  # noqa: E402
from hirelabs_llm.score import CALIBRATION_FILE, MODEL_FILE, TOKENIZER_FILE, Scorer, pick_device  # noqa: E402
from hirelabs_llm.tokenizer import BPETokenizer  # noqa: E402

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_OUTPUT_DIR = os.path.join(PROJECT_ROOT, "models", "hirelabs-llm")


def lr_at(step, total, base_lr, warmup):
    if step < warmup:
        return base_lr * (step + 1) / warmup
    progress = (step - warmup) / max(1, total - warmup)
    return base_lr * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * progress)))


def to_tensors(batch, device):
    inputs, targets = batch
    return torch.tensor(inputs, device=device), torch.tensor(targets, device=device)


@torch.no_grad()
def mean_loss(model, batches):
    model.eval()
    losses = [model(x, y)[1].item() for x, y in batches]
    model.train()
    return sum(losses) / len(losses)


def fit_logistic(values, labels, steps=500):
    """1-D logistic regression (score = sigmoid(a * pmi + b)) by gradient descent."""
    x, y = torch.tensor(values), torch.tensor(labels, dtype=torch.float32)
    mean, std = x.mean(), x.std().clamp(min=1e-6)
    z = (x - mean) / std
    a, b = torch.zeros(1, requires_grad=True), torch.zeros(1, requires_grad=True)
    optimizer = torch.optim.Adam([a, b], lr=0.1)
    for _ in range(steps):
        optimizer.zero_grad()
        loss = torch.nn.functional.binary_cross_entropy_with_logits(a * z + b, y)
        loss.backward()
        optimizer.step()
    # Undo the standardisation so the curve applies to raw pmi.
    a, b = a.detach(), b.detach()
    return {"a": (a / std).item(), "b": (b - a * mean / std).item()}


def calibrate(scorer, corpus, jobs, per_job, seed):
    """Fit the 0-100 curve on train resumes: same-role pairs as 1, other-role pairs as 0.

    The same-role relation comes from the documents' own titles, not from any score label.
    The curve is monotonic, so it never changes a ranking, only the number shown.
    """
    rng = random.Random(seed)
    job_ids = rng.sample(corpus.pairable_jobs, min(jobs, len(corpus.pairable_jobs)))
    values, labels = [], []
    for jid in job_ids:
        role = corpus.job_roles[jid]
        same = corpus.resumes_by_role[role]
        other = [rid for rid, r in corpus.resume_roles.items() if r != role]
        picked = [(rid, 1) for rid in rng.sample(same, min(per_job, len(same)))]
        picked += [(rid, 0) for rid in rng.sample(other, min(per_job, len(other)))]
        # A mix of full, title-blind and shortened text, so the curve also fits text that is
        # not laid out like the template.
        views = (lambda t: t, drop_title, lambda t: drop_lines(t, 0.35, rng))
        texts = [views[i % 3](corpus.resumes[rid]) for i, (rid, _) in enumerate(picked)]
        job = corpus.jobs[jid] if rng.random() < 0.5 else drop_lines(corpus.jobs[jid], 0.35, rng)
        values += scorer.pmi(job, texts)
        labels += [label for _, label in picked]
    calibration = fit_logistic(values, labels)
    calibration["fitted_on"] = f"{len(values)} train-split pairs; same role = 1, other role = 0 (no score labels)"
    return calibration


def main():
    parser = argparse.ArgumentParser(description="Train hirelabs-llm from scratch.")
    parser.add_argument("--data-dir", required=True, help="HireLabs-Data folder (raw/, splits.json)")
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--vocab-size", type=int, default=2048)
    parser.add_argument("--block-size", type=int, default=256)
    parser.add_argument("--n-layer", type=int, default=4)
    parser.add_argument("--n-head", type=int, default=4)
    parser.add_argument("--n-embd", type=int, default=192)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--steps", type=int, default=3000)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--weight-decay", type=float, default=0.1)
    parser.add_argument("--warmup", type=int, default=100)
    parser.add_argument("--eval-every", type=int, default=250)
    parser.add_argument("--device", default="auto", help="auto, cpu, mps (Mac GPU) or cuda")
    parser.add_argument("--relayout-prob", type=float, default=0.5,
                        help="Share of samples re-laid-out by rules (augment.py); 0 trains on the template only")
    parser.add_argument("--seed", type=int, default=1337)
    args = parser.parse_args()

    random.seed(args.seed)
    torch.manual_seed(args.seed)
    device = pick_device(args.device)
    os.makedirs(args.output_dir, exist_ok=True)
    started = time.time()

    train = Corpus(args.data_dir, "train")
    dev = Corpus(args.data_dir, "dev")
    print(f"Data: {len(train.resumes)} train resumes, {len(dev.resumes)} dev resumes (held out), "
          f"{len(train.jobs)} jobs, {len(train.all_roles)} roles")

    print(f"Training tokenizer (vocab {args.vocab_size})...")
    tokenizer = BPETokenizer.train(train.texts_for_tokenizer(), args.vocab_size)
    tokenizer.save(os.path.join(args.output_dir, TOKENIZER_FILE))

    config = GPTConfig(vocab_size=tokenizer.vocab_size, block_size=args.block_size, n_layer=args.n_layer,
                       n_head=args.n_head, n_embd=args.n_embd, dropout=args.dropout)
    model = GPT(config).to(device)
    print(f"Model: {model.num_parameters() / 1e6:.2f}M parameters, random init, device {device}")

    sampler = SequenceSampler(train, tokenizer, args.block_size, relayout_prob=args.relayout_prob, seed=args.seed)
    dev_sampler = SequenceSampler(dev, tokenizer, args.block_size, relayout_prob=args.relayout_prob, seed=args.seed + 1)
    dev_batches = [to_tensors(dev_sampler.batch(args.batch_size), device) for _ in range(20)]

    decay = [p for n, p in model.named_parameters() if p.dim() >= 2]
    no_decay = [p for n, p in model.named_parameters() if p.dim() < 2]
    optimizer = torch.optim.AdamW([{"params": decay, "weight_decay": args.weight_decay},
                                   {"params": no_decay, "weight_decay": 0.0}], lr=args.lr, betas=(0.9, 0.95))

    best_dev, history = float("inf"), []
    checkpoint_path = os.path.join(args.output_dir, MODEL_FILE)
    model.train()
    for step in range(args.steps + 1):
        if step % args.eval_every == 0 or step == args.steps:
            dev_loss = mean_loss(model, dev_batches)
            history.append({"step": step, "dev_loss": round(dev_loss, 4)})
            marker = ""
            if dev_loss < best_dev:
                best_dev, marker = dev_loss, "  (saved)"
                state = {k: v.detach().cpu() for k, v in model.state_dict().items()}
                torch.save({"config": config.to_dict(), "state_dict": state, "step": step,
                            "max_job_tokens": sampler.max_job_tokens}, checkpoint_path)
            print(f"step {step:5d}  dev loss {dev_loss:.4f}{marker}", flush=True)
            if step == args.steps:
                break
        for group in optimizer.param_groups:
            group["lr"] = lr_at(step, args.steps, args.lr, args.warmup)
        x, y = to_tensors(sampler.batch(args.batch_size), device)
        _, loss = model(x, y)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        if step % 100 == 0:
            history.append({"step": step, "train_loss": round(loss.item(), 4)})

    print("Fitting the 0-100 score curve on train resumes...")
    scorer = Scorer.load(args.output_dir, device=str(device))
    calibration = calibrate(scorer, train, jobs=100, per_job=4, seed=args.seed)
    with open(os.path.join(args.output_dir, CALIBRATION_FILE), "w", encoding="utf-8") as handle:
        json.dump(calibration, handle, indent=2)

    log = {
        "model": "hirelabs-llm",
        "from_scratch": True,
        "labels_used": "none",
        # Folder name only: a full path would leak the local user name into shared files.
        "data_dir": os.path.basename(os.path.abspath(args.data_dir)),
        "train_resumes": len(train.resumes),
        "jobs": len(train.jobs),
        "parameters": model.num_parameters(),
        "config": config.to_dict(),
        "args": {k: v for k, v in vars(args).items() if k not in ("data_dir", "output_dir")},
        "device": str(device),
        "best_dev_loss": round(best_dev, 4),
        "calibration": calibration,
        "minutes": round((time.time() - started) / 60, 1),
        "history": history,
    }
    with open(os.path.join(args.output_dir, "training-log.json"), "w", encoding="utf-8") as handle:
        json.dump(log, handle, indent=2)
    print(f"Done in {log['minutes']} min. Best dev loss {best_dev:.4f}. Saved to {args.output_dir}")
    sample_job = train.jobs[train.pairable_jobs[0]]
    print("\nSample: a resume the model writes for this job:\n" + sample_job.split("\n")[0])
    print(scorer.write_resume(sample_job))


if __name__ == "__main__":
    main()
