#!/usr/bin/env python3
"""
Train hirelabs-matcher v2 from scratch: a small text encoder that maps resumes and job
descriptions to 384-d vectors (no pretrained weights, no fine-tuning, no labels).

Contrastive training (InfoNCE): each job in a batch is pulled towards a resume with the same
role and pushed away from the other resumes. Same-role resumes elsewhere in the batch are not
counted as negatives. Resume text is re-laid-out by rules (augment.py), titles are removed half
the time, and lines are dropped, so the encoder matches on content rather than layout.

  python3 scripts/python/train_scratch_matcher.py --data-dir /path/HireLabs-Data
"""

import argparse
import json
import math
import os
import random
import sys
import time

import torch
import torch.nn.functional as F

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hirelabs_llm.augment import relayout  # noqa: E402
from hirelabs_llm.corpus import Corpus, drop_lines, drop_title  # noqa: E402
from hirelabs_llm.encoder import Encoder, EncoderConfig, batch_ids, save  # noqa: E402
from hirelabs_llm.score import pick_device  # noqa: E402
from hirelabs_llm.tokenizer import BPETokenizer  # noqa: E402
from matcher_metrics import ranking_metrics  # noqa: E402

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_OUTPUT_DIR = os.path.join(PROJECT_ROOT, "models", "hirelabs-matcher-v2")


TITLE_DROP = 0.8


def vary(text, rng, resume=False):
    """One training view of a document: optional title drop, re-layout and line drop.

    Resume titles are dropped most of the time: with titles the encoder learns to match job
    titles to resume titles (a shortcut) instead of skills and experience."""
    if resume and rng.random() < TITLE_DROP:
        text = drop_title(text)
    if rng.random() < 0.5:
        text = relayout(text, rng)
    if rng.random() < 0.4:
        text = drop_lines(text, 0.3, rng)
    return text


def sample_batch(corpus, size, rng):
    """size (job text, resume text, role) triples with distinct jobs."""
    jobs = rng.sample(corpus.pairable_jobs, min(size, len(corpus.pairable_jobs)))
    triples = []
    for jid in jobs:
        role = corpus.job_roles[jid]
        rid = rng.choice(corpus.resumes_by_role[role])
        triples.append((vary(corpus.jobs[jid], rng), vary(corpus.resumes[rid], rng, resume=True), role))
    return triples


def info_nce(job_vecs, resume_vecs, roles, temperature):
    """Symmetric InfoNCE; same-role off-diagonal pairs are masked out (they are not negatives)."""
    logits = job_vecs @ resume_vecs.T / temperature
    same = torch.tensor([[a == b for b in roles] for a in roles], device=logits.device)
    eye = torch.eye(len(roles), dtype=torch.bool, device=logits.device)
    logits = logits.masked_fill(same & ~eye, float("-inf"))
    targets = torch.arange(len(roles), device=logits.device)
    return (F.cross_entropy(logits, targets) + F.cross_entropy(logits.T, targets)) / 2


@torch.no_grad()
def dev_mrr(model, tokenizer, dev, device, max_jobs=80, seed=0, blind=True):
    model.eval()
    rng = random.Random(seed)
    job_ids = rng.sample(sorted(dev.pairable_jobs), min(max_jobs, len(dev.pairable_jobs)))
    resume_ids = sorted(dev.resumes)

    def embed(texts):
        out = []
        for start in range(0, len(texts), 64):
            ids, mask = batch_ids(tokenizer, texts[start:start + 64], model.config.max_len)
            out.append(model(ids.to(device), mask.to(device)))
        return torch.cat(out)

    resumes = embed([drop_title(dev.resumes[rid]) if blind else dev.resumes[rid] for rid in resume_ids])
    jobs = embed([dev.jobs[jid] for jid in job_ids])
    scores = (jobs @ resumes.T).cpu()
    rankings = {jid: [resume_ids[i] for i in scores[n].argsort(descending=True).tolist()] for n, jid in enumerate(job_ids)}
    relevant = {jid: {rid for rid in resume_ids if dev.resume_roles[rid] == dev.job_roles[jid]} for jid in job_ids}
    model.train()
    return ranking_metrics(rankings, relevant, ks=(1, 5))["mrr"]


def main():
    parser = argparse.ArgumentParser(description="Train hirelabs-matcher v2 from scratch.")
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--vocab-size", type=int, default=2048)
    parser.add_argument("--max-len", type=int, default=256, help="Tokens read per document (about 2.5 per word)")
    parser.add_argument("--steps", type=int, default=1500)
    parser.add_argument("--batch-size", type=int, default=48)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--temperature", type=float, default=0.07)
    parser.add_argument("--eval-every", type=int, default=250)
    parser.add_argument("--device", default="auto")
    parser.add_argument("--seed", type=int, default=1337)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    torch.manual_seed(args.seed)
    device = pick_device(args.device)
    started = time.time()

    train = Corpus(args.data_dir, "train")
    dev = Corpus(args.data_dir, "dev")
    tokenizer = BPETokenizer.train(train.texts_for_tokenizer(), args.vocab_size)
    model = Encoder(EncoderConfig(vocab_size=tokenizer.vocab_size, max_len=args.max_len)).to(device)
    print(f"Encoder: {model.num_parameters() / 1e6:.2f}M parameters, random init, device {device}; "
          f"{len(train.resumes)} train resumes, {len(train.jobs)} jobs")

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
    best, history = -1.0, []
    for step in range(args.steps + 1):
        if step % args.eval_every == 0 or step == args.steps:
            # Checkpoint on full text and titles removed together: both matter in real use.
            blind = dev_mrr(model, tokenizer, dev, device, blind=True)
            full = dev_mrr(model, tokenizer, dev, device, blind=False)
            mrr = (blind + full) / 2
            history.append({"step": step, "dev_mrr_full": round(full, 4), "dev_mrr_title_blind": round(blind, 4)})
            mark = ""
            if mrr > best:
                best, mark = mrr, "  (saved)"
                save(model, tokenizer, args.output_dir, {"step": step, "dev_mrr_full": round(full, 4), "dev_mrr_title_blind": round(blind, 4)})
            print(f"step {step:5d}  dev MRR full {full:.3f}  titles removed {blind:.3f}{mark}", flush=True)
            if step == args.steps:
                break
        progress = step / args.steps
        lr = args.lr * min(1.0, (step + 1) / 100) * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * progress)))
        for group in optimizer.param_groups:
            group["lr"] = lr
        triples = sample_batch(train, args.batch_size, rng)
        job_ids, job_mask = batch_ids(tokenizer, [t[0] for t in triples], model.config.max_len)
        res_ids, res_mask = batch_ids(tokenizer, [t[1] for t in triples], model.config.max_len)
        loss = info_nce(model(job_ids.to(device), job_mask.to(device)), model(res_ids.to(device), res_mask.to(device)),
                        [t[2] for t in triples], args.temperature)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        if step % 100 == 0:
            history.append({"step": step, "loss": round(loss.item(), 4)})

    log = {"model": "hirelabs-matcher-v2", "from_scratch": True, "labels_used": "none",
           "data_dir": os.path.basename(os.path.abspath(args.data_dir)), "parameters": model.num_parameters(),
           "best_dev_mrr_mean_full_and_title_blind": round(best, 4), "minutes": round((time.time() - started) / 60, 1),
           "args": {k: v for k, v in vars(args).items() if k not in ("data_dir", "output_dir")}, "history": history}
    with open(os.path.join(args.output_dir, "training-log.json"), "w", encoding="utf-8") as handle:
        json.dump(log, handle, indent=2)
    print(f"Done in {log['minutes']} min. Best dev MRR (mean of full and titles removed) {best:.3f}. Saved to {args.output_dir}")


if __name__ == "__main__":
    main()
