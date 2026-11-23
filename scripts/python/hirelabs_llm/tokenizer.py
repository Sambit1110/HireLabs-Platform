"""Byte-level BPE tokenizer written from scratch (no tokenizer libraries).

Text is split into word-like chunks, each chunk is turned into UTF-8 bytes (ids 0-255), and
training repeatedly merges the most frequent adjacent pair into a new id. Special tokens are
added after the merges and are only produced when the caller asks for them.
"""

import json
import re
from collections import Counter
from typing import Dict, List, Sequence, Tuple

# A leading space stays attached to the word after it, like GPT-2.
CHUNK = re.compile(r" ?[A-Za-z]+| ?[0-9]+| ?[^\sA-Za-z0-9]+|\s+(?!\S)|\s+")

SPECIAL_TOKENS = ("<|pad|>", "<|job|>", "<|resume|>", "<|end|>")


def _merge(ids: Sequence[int], pair: Tuple[int, int], new_id: int) -> List[int]:
    out, i = [], 0
    while i < len(ids):
        if i + 1 < len(ids) and ids[i] == pair[0] and ids[i + 1] == pair[1]:
            out.append(new_id)
            i += 2
        else:
            out.append(ids[i])
            i += 1
    return out


class BPETokenizer:
    def __init__(self, merges: List[Tuple[int, int]]):
        self.merges = [tuple(pair) for pair in merges]
        self.ranks = {pair: 256 + rank for rank, pair in enumerate(self.merges)}
        self.vocab: Dict[int, bytes] = {i: bytes([i]) for i in range(256)}
        for (a, b), new_id in self.ranks.items():
            self.vocab[new_id] = self.vocab[a] + self.vocab[b]
        first_special = 256 + len(self.merges)
        self.special = {token: first_special + i for i, token in enumerate(SPECIAL_TOKENS)}
        self._cache: Dict[str, List[int]] = {}

    @property
    def vocab_size(self) -> int:
        return 256 + len(self.merges) + len(self.special)

    @property
    def pad_id(self) -> int:
        return self.special["<|pad|>"]

    def token(self, name: str) -> int:
        return self.special[name]

    @classmethod
    def train(cls, texts: Sequence[str], vocab_size: int) -> "BPETokenizer":
        num_merges = vocab_size - 256 - len(SPECIAL_TOKENS)
        if num_merges < 0:
            raise ValueError(f"vocab_size must be at least {256 + len(SPECIAL_TOKENS)}")
        chunk_counts = Counter(chunk for text in texts for chunk in CHUNK.findall(text))
        words = [(list(chunk.encode("utf-8")), count) for chunk, count in chunk_counts.items()]
        merges: List[Tuple[int, int]] = []
        for step in range(num_merges):
            pair_counts: Counter = Counter()
            for ids, count in words:
                for pair in zip(ids, ids[1:]):
                    pair_counts[pair] += count
            if not pair_counts:
                break
            # Ties break on the pair itself so training is deterministic.
            pair = max(pair_counts, key=lambda p: (pair_counts[p], -p[0], -p[1]))
            if pair_counts[pair] < 2:
                break
            new_id = 256 + step
            merges.append(pair)
            words = [(_merge(ids, pair, new_id) if len(ids) > 1 else ids, count) for ids, count in words]
        return cls(merges)

    def _encode_chunk(self, chunk: str) -> List[int]:
        cached = self._cache.get(chunk)
        if cached is not None:
            return cached
        ids = list(chunk.encode("utf-8"))
        while len(ids) > 1:
            pair = min(zip(ids, ids[1:]), key=lambda p: self.ranks.get(p, float("inf")))
            if pair not in self.ranks:
                break
            ids = _merge(ids, pair, self.ranks[pair])
        if len(self._cache) < 200_000:
            self._cache[chunk] = ids
        return ids

    def encode(self, text: str) -> List[int]:
        """Encode plain text. Special-token strings inside user text are NOT treated as special."""
        return [token for chunk in CHUNK.findall(text) for token in self._encode_chunk(chunk)]

    def decode(self, ids: Sequence[int]) -> str:
        names = {v: k for k, v in self.special.items()}
        parts: List[bytes] = []
        for i in ids:
            parts.append(names[i].encode() if i in names else self.vocab[i])
        return b"".join(parts).decode("utf-8", errors="replace")

    def save(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as handle:
            json.dump({"type": "hirelabs-bpe", "merges": self.merges, "special": list(SPECIAL_TOKENS)}, handle)

    @classmethod
    def load(cls, path: str) -> "BPETokenizer":
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
        if data.get("type") != "hirelabs-bpe" or tuple(data.get("special", ())) != SPECIAL_TOKENS:
            raise ValueError(f"{path} is not a hirelabs-llm tokenizer")
        return cls([tuple(pair) for pair in data["merges"]])
