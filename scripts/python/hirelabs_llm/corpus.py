"""Training text for hirelabs-llm, built only from the raw team texts (no labels).

Every resume and job description starts with a role title. A job and a resume with the same
role form a "same-role" pair; that relation comes from the documents themselves, not from
Gemini or a human score. The model is trained on three kinds of sequences:

    <|job|> job text <|resume|> same-role resume <|end|>    (pair)
    <|resume|> resume <|end|>                               (resume alone)
    <|job|> job text <|end|>                                (job alone)

Half the time a resume's title lines are removed, so the model has to link a job to a resume
through skills and experience, not by copying the title. Half the time, too, random lines of a
job or resume are dropped, so the model also copes with shorter, differently laid-out text
like real uploads.
"""

import json
import os
import random
import re
from typing import Dict, List, Optional, Sequence

LEVEL_PREFIX = re.compile(r"^(Junior|Mid|Senior|Lead|Principal|Staff)\s+", re.IGNORECASE)


def clean(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    return "\n".join(line for line in lines if line)


def resume_role(text: str) -> str:
    return clean(text).split("\n", 1)[0].strip()


def job_role(text: str, known_roles: Sequence[str] = ()) -> str:
    """The job's role: the longest known resume role its title ends with, else the title minus a level word."""
    title = clean(text).split("\n", 1)[0].strip()
    matches = [role for role in known_roles if title.lower().endswith(role.lower())]
    if matches:
        return max(matches, key=len)
    return LEVEL_PREFIX.sub("", title, count=1)


def drop_title(text: str) -> str:
    """Remove the lines that name the resume's role, keeping skills and experience."""
    lines = clean(text).split("\n")
    title = lines[0].lower()
    kept = [line for line in lines[1:] if title not in line.lower()]
    return "\n".join(kept) or clean(text)


def drop_lines(text: str, rate: float, rng: random.Random) -> str:
    """Randomly remove lines (at least one is kept): a stand-in for text that is not laid out like the template."""
    lines = clean(text).split("\n")
    kept = [line for line in lines if rng.random() >= rate]
    return "\n".join(kept or [rng.choice(lines)])


def load_texts(folder: str) -> Dict[str, str]:
    texts = {}
    for name in sorted(os.listdir(folder)):
        if name.endswith(".txt"):
            with open(os.path.join(folder, name), encoding="utf-8") as handle:
                text = clean(handle.read())
            if text:
                texts[name[:-4]] = text
    return texts


class Corpus:
    """Resumes of one split plus the shared job pool, grouped by role."""

    def __init__(self, data_dir: str, resume_split: str = "train", resume_ids: Optional[Sequence[str]] = None):
        resumes = load_texts(os.path.join(data_dir, "raw", "resumes"))
        self.jobs = load_texts(os.path.join(data_dir, "raw", "jds"))
        if not resumes or not self.jobs:
            raise ValueError(f"No resume or job texts found under {data_dir}/raw")
        if resume_ids is None:
            with open(os.path.join(data_dir, "splits.json"), encoding="utf-8") as handle:
                splits = json.load(handle)
            resume_ids = [rid for rid, split in splits.items() if split == resume_split and rid in resumes]
        self.resumes = {rid: resumes[rid] for rid in resume_ids}
        if not self.resumes:
            raise ValueError(f"No resumes in split {resume_split!r}")
        self.all_roles = sorted({resume_role(t) for t in resumes.values()})
        self.resume_roles = {rid: resume_role(t) for rid, t in self.resumes.items()}
        self.job_roles = {jid: job_role(t, self.all_roles) for jid, t in self.jobs.items()}
        self.resumes_by_role: Dict[str, List[str]] = {}
        for rid, role in self.resume_roles.items():
            self.resumes_by_role.setdefault(role, []).append(rid)
        self.pairable_jobs = [jid for jid, role in self.job_roles.items() if role in self.resumes_by_role]

    def texts_for_tokenizer(self) -> List[str]:
        return list(self.resumes.values()) + list(self.jobs.values())


class SequenceSampler:
    """Draws token sequences for training (pair / resume / job, as described above)."""

    def __init__(self, corpus: Corpus, tokenizer, block_size: int, max_job_tokens: int = 160,
                 pair_prob: float = 0.5, resume_prob: float = 0.3, title_drop_prob: float = 0.5,
                 line_drop_prob: float = 0.5, line_drop_rate: float = 0.35, seed: int = 0):
        self.corpus, self.tok, self.block_size = corpus, tokenizer, block_size
        self.max_job_tokens = max_job_tokens
        self.pair_prob, self.resume_prob, self.title_drop_prob = pair_prob, resume_prob, title_drop_prob
        self.line_drop_prob, self.line_drop_rate = line_drop_prob, line_drop_rate
        self.rng = random.Random(seed)
        self.newline = tokenizer.encode("\n")
        # Each document as token lists per line, so lines can be dropped without re-tokenizing.
        lines = lambda text: [tokenizer.encode(line) for line in text.split("\n")]  # noqa: E731
        self.job_lines = {jid: lines(t) for jid, t in corpus.jobs.items()}
        self.resume_lines = {rid: lines(t) for rid, t in corpus.resumes.items()}
        self.blind_lines = {rid: lines(drop_title(t)) for rid, t in corpus.resumes.items()}
        self.JOB, self.RESUME, self.END = (tokenizer.token(n) for n in ("<|job|>", "<|resume|>", "<|end|>"))

    def _join(self, doc_lines: List[List[int]]) -> List[int]:
        if len(doc_lines) > 1 and self.rng.random() < self.line_drop_prob:
            kept = [line for line in doc_lines if self.rng.random() >= self.line_drop_rate]
            doc_lines = kept or [self.rng.choice(doc_lines)]
        out: List[int] = []
        for i, line in enumerate(doc_lines):
            out += (self.newline if i else []) + line
        return out

    def _job(self, jid: str) -> List[int]:
        return self._join(self.job_lines[jid])[: self.max_job_tokens]

    def _resume(self, rid: str) -> List[int]:
        source = self.blind_lines if self.rng.random() < self.title_drop_prob else self.resume_lines
        return self._join(source[rid])

    def sample(self) -> List[int]:
        roll = self.rng.random()
        if roll < self.pair_prob and self.corpus.pairable_jobs:
            jid = self.rng.choice(self.corpus.pairable_jobs)
            rid = self.rng.choice(self.corpus.resumes_by_role[self.corpus.job_roles[jid]])
            seq = [self.JOB] + self._job(jid) + [self.RESUME] + self._resume(rid) + [self.END]
        elif roll < self.pair_prob + self.resume_prob:
            rid = self.rng.choice(list(self.resume_lines))
            seq = [self.RESUME] + self._resume(rid) + [self.END]
        else:
            jid = self.rng.choice(list(self.job_lines))
            seq = [self.JOB] + self._job(jid) + [self.END]
        return seq[: self.block_size + 1]

    def batch(self, batch_size: int):
        """(inputs, targets) lists, right-padded; padded targets are -100 so they never count."""
        seqs = [self.sample() for _ in range(batch_size)]
        width = max(len(s) for s in seqs) - 1
        inputs, targets = [], []
        for seq in seqs:
            x, y = seq[:-1], seq[1:]
            pad = width - len(x)
            inputs.append(x + [self.tok.pad_id] * pad)
            targets.append(y + [-100] * pad)
        return inputs, targets
