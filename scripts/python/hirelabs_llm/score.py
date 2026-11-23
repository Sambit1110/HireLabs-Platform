"""Match scoring with hirelabs-llm.

The score is how much reading the job makes the model expect this resume (pointwise mutual
information, averaged per resume token):

    pmi = mean_t [ log p(resume_t | job, resume_<t) - log p(resume_t | resume_<t) ]

pmi > 0 means the job makes the resume more likely: the skills and experience fit what the
model learned people in that role write. A logistic curve fitted at training time maps pmi to
0-100. "missingSkills" is a plain text check (not the model): required skills listed in the
job that do not appear in the resume.
"""

import json
import math
import os
import re
import threading
from typing import Dict, List, Optional, Sequence

import torch
import torch.nn.functional as F

from .model import GPT, GPTConfig
from .tokenizer import BPETokenizer

MODEL_FILE, TOKENIZER_FILE, CALIBRATION_FILE = "model.pt", "tokenizer.json", "calibration.json"
VERDICTS = (("strong", 75), ("moderate", 50), ("weak", 0))  # same bands as the team dataset
SKILL_LINE = re.compile(r"^\s*(required skills|requirements|must have)\s*:\s*(.+)$", re.IGNORECASE | re.MULTILINE)


def verdict_for(score: int) -> str:
    return next(name for name, low in VERDICTS if score >= low)


def missing_skills(job_text: str, resume_text: str) -> List[str]:
    """Required skills from a "Required skills: a, b" line that the resume never mentions."""
    match = SKILL_LINE.search(job_text)
    if not match:
        return []
    resume = resume_text.lower()
    skills = [s.strip().rstrip(".") for s in re.split(r"[,;]", match.group(2)) if s.strip()]
    return [s for s in skills if s.lower() not in resume]


def pick_device(name: str = "auto") -> torch.device:
    if name != "auto":
        return torch.device(name)
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


class Scorer:
    def __init__(self, model: GPT, tokenizer: BPETokenizer, calibration: Optional[Dict[str, float]] = None,
                 device: str = "cpu", max_job_tokens: int = 160):
        self.model = model.to(pick_device(device)).eval()
        self.device = next(self.model.parameters()).device
        self.tok = tokenizer
        self.calibration = calibration or {"a": 1.0, "b": 0.0}
        # The job may use at most half the context, so the resume always has room.
        self.max_job_tokens = min(max_job_tokens, self.model.config.block_size // 2 - 2)
        self.JOB, self.RESUME, self.END = (tokenizer.token(n) for n in ("<|job|>", "<|resume|>", "<|end|>"))
        self._lock = threading.Lock()  # one forward pass at a time when serving
        self._baseline_cache: Dict[tuple, float] = {}

    @classmethod
    def load(cls, model_dir: str, device: str = "cpu") -> "Scorer":
        checkpoint = torch.load(os.path.join(model_dir, MODEL_FILE), map_location="cpu", weights_only=True)
        model = GPT(GPTConfig(**checkpoint["config"]))
        model.load_state_dict(checkpoint["state_dict"])
        tokenizer = BPETokenizer.load(os.path.join(model_dir, TOKENIZER_FILE))
        calibration = None
        calibration_path = os.path.join(model_dir, CALIBRATION_FILE)
        if os.path.isfile(calibration_path):
            with open(calibration_path, encoding="utf-8") as handle:
                calibration = json.load(handle)
        return cls(model, tokenizer, calibration, device, checkpoint.get("max_job_tokens", 160))

    def _resume_ids(self, resume_text: str, room: int) -> List[int]:
        return self.tok.encode(resume_text)[:room] + [self.END]

    @torch.no_grad()
    def _token_logprobs(self, sequences: Sequence[List[int]], starts: Sequence[int], batch_size: int = 64):
        """Sum of log p(token) from position `start` to the end of each sequence, and the token count."""
        results = []
        for offset in range(0, len(sequences), batch_size):
            chunk, chunk_starts = sequences[offset:offset + batch_size], starts[offset:offset + batch_size]
            width = max(len(s) for s in chunk) - 1
            inputs = torch.full((len(chunk), width), self.tok.pad_id, dtype=torch.long)
            targets = torch.full((len(chunk), width), -100, dtype=torch.long)
            for row, (seq, start) in enumerate(zip(chunk, chunk_starts)):
                inputs[row, : len(seq) - 1] = torch.tensor(seq[:-1])
                # Target position i predicts seq[i + 1]; keep only the resume part.
                targets[row, start - 1: len(seq) - 1] = torch.tensor(seq[start:])
            logits, _ = self.model(inputs.to(self.device))
            logp = F.log_softmax(logits.float(), dim=-1).cpu()
            mask = targets != -100
            picked = logp.gather(-1, targets.clamp(min=0).unsqueeze(-1)).squeeze(-1) * mask
            results.extend(zip(picked.sum(1).tolist(), mask.sum(1).tolist()))
        return results

    def pmi(self, job_text: str, resume_texts: Sequence[str]) -> List[float]:
        job_ids = [self.JOB] + self.tok.encode(job_text)[: self.max_job_tokens] + [self.RESUME]
        room = self.model.config.block_size - len(job_ids)
        resume_ids = [self._resume_ids(t, room) for t in resume_texts]
        # log p(resume) alone, over exactly the tokens the conditional pass scores. Cached,
        # because evaluation scores the same resumes against many jobs.
        keys = [(t, room) for t in resume_texts]
        found = {key: self._baseline_cache[key] for key in keys if key in self._baseline_cache}
        todo = [i for i, key in enumerate(keys) if key not in found]
        if todo:
            seqs = [[self.RESUME] + resume_ids[i] for i in todo]
            for i, (total, _) in zip(todo, self._token_logprobs(seqs, [1] * len(seqs))):
                found[keys[i]] = total
            if len(self._baseline_cache) > 10_000:
                self._baseline_cache.clear()
            self._baseline_cache.update(found)
        baselines = [found[key] for key in keys]
        conditional = self._token_logprobs([job_ids + ids for ids in resume_ids], [len(job_ids)] * len(resume_ids))
        return [(total - base) / count for (total, count), base in zip(conditional, baselines)]

    def to_score(self, pmi: float) -> int:
        z = self.calibration["a"] * pmi + self.calibration["b"]
        return int(round(100 / (1 + math.exp(-max(min(z, 50), -50)))))

    def match(self, job_text: str, resume_text: str) -> Dict:
        with self._lock:
            value = self.pmi(job_text, [resume_text])[0]
        score = self.to_score(value)
        return {
            "score": score,
            "verdict": verdict_for(score),
            "pmi": round(value, 4),
            "missingSkills": missing_skills(job_text, resume_text),
            "model_used": "hirelabs-llm",
        }

    @torch.no_grad()
    def write_resume(self, job_text: str, max_new_tokens: int = 120, temperature: float = 0.8, seed: int = 0) -> str:
        """Generate the kind of resume the model expects for this job (shows it is a language model)."""
        torch.manual_seed(seed)
        job_ids = [self.JOB] + self.tok.encode(job_text)[: self.max_job_tokens] + [self.RESUME]
        idx = torch.tensor([job_ids], device=self.device)
        out = self.model.generate(idx, max_new_tokens, temperature=temperature, stop_id=self.END)
        new = [t for t in out[0, len(job_ids):].tolist() if t != self.END]
        return self.tok.decode(new)
