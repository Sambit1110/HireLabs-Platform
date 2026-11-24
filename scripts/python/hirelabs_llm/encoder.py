"""hirelabs-matcher v2: a text encoder built and trained from scratch (no pretrained weights).

A small bidirectional transformer reads a resume or a job description and returns a
384-dimensional unit vector (the size the app's pgvector column expects). Similar roles land
close together. It is trained with a contrastive loss on same-role job/resume pairs, with no
labels (see train_scratch_matcher.py).

`ScratchMatcher` mimics the parts of SentenceTransformer the model server uses: `encode(...)`
and `get_sentence_embedding_dimension()`.
"""

import json
import os
from dataclasses import asdict, dataclass
from typing import List, Sequence

import torch
import torch.nn as nn
import torch.nn.functional as F

from .tokenizer import BPETokenizer

MARKER_FILE = "encoder.json"
MODEL_FILE = "model.pt"
TOKENIZER_FILE = "tokenizer.json"


@dataclass
class EncoderConfig:
    vocab_size: int
    max_len: int = 256
    n_layer: int = 4
    n_head: int = 4
    n_embd: int = 256
    dim: int = 384
    dropout: float = 0.1

    def to_dict(self):
        return asdict(self)


class Encoder(nn.Module):
    def __init__(self, config: EncoderConfig):
        super().__init__()
        self.config = config
        self.tok_emb = nn.Embedding(config.vocab_size, config.n_embd)
        self.pos_emb = nn.Embedding(config.max_len, config.n_embd)
        layer = nn.TransformerEncoderLayer(
            d_model=config.n_embd, nhead=config.n_head, dim_feedforward=4 * config.n_embd,
            dropout=config.dropout, activation="gelu", batch_first=True, norm_first=True,
        )
        self.blocks = nn.TransformerEncoder(layer, num_layers=config.n_layer, enable_nested_tensor=False)
        self.ln = nn.LayerNorm(config.n_embd)
        self.proj = nn.Linear(config.n_embd, config.dim)
        for module in self.modules():
            if isinstance(module, (nn.Linear, nn.Embedding)):
                nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if isinstance(module, nn.Linear) and module.bias is not None:
                nn.init.zeros_(module.bias)

    def num_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters())

    def forward(self, ids: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        """ids, mask: (batch, length); mask is 1 for real tokens. Returns unit vectors (batch, dim)."""
        positions = torch.arange(ids.shape[1], device=ids.device)
        x = self.tok_emb(ids) + self.pos_emb(positions)
        x = self.blocks(x, src_key_padding_mask=mask == 0)
        x = self.ln(x)
        weights = mask.unsqueeze(-1).to(x.dtype)
        pooled = (x * weights).sum(1) / weights.sum(1).clamp(min=1.0)
        return F.normalize(self.proj(pooled), dim=-1)


def batch_ids(tokenizer: BPETokenizer, texts: Sequence[str], max_len: int):
    """Token ids and attention mask for a batch, truncated to max_len and right-padded."""
    encoded = [tokenizer.encode(text)[:max_len] or [tokenizer.pad_id] for text in texts]
    width = max(len(ids) for ids in encoded)
    ids = torch.full((len(encoded), width), tokenizer.pad_id, dtype=torch.long)
    mask = torch.zeros((len(encoded), width), dtype=torch.long)
    for row, tokens in enumerate(encoded):
        ids[row, : len(tokens)] = torch.tensor(tokens)
        mask[row, : len(tokens)] = 1
    return ids, mask


def save(model: Encoder, tokenizer: BPETokenizer, folder: str, extra: dict = None) -> None:
    os.makedirs(folder, exist_ok=True)
    state = {k: v.detach().cpu() for k, v in model.state_dict().items()}
    torch.save({"config": model.config.to_dict(), "state_dict": state}, os.path.join(folder, MODEL_FILE))
    tokenizer.save(os.path.join(folder, TOKENIZER_FILE))
    with open(os.path.join(folder, MARKER_FILE), "w", encoding="utf-8") as handle:
        json.dump({"type": "hirelabs-scratch-encoder", "dim": model.config.dim, **(extra or {})}, handle, indent=2)


def is_scratch_matcher(folder: str) -> bool:
    return os.path.isfile(os.path.join(folder, MARKER_FILE))


class ScratchMatcher:
    """Loads a saved encoder and serves embeddings like SentenceTransformer.encode."""

    def __init__(self, model: Encoder, tokenizer: BPETokenizer, device: str = "cpu"):
        self.model = model.to(device).eval()
        self.device = device
        self.tok = tokenizer

    @classmethod
    def load(cls, folder: str, device: str = "cpu") -> "ScratchMatcher":
        checkpoint = torch.load(os.path.join(folder, MODEL_FILE), map_location="cpu", weights_only=True)
        model = Encoder(EncoderConfig(**checkpoint["config"]))
        model.load_state_dict(checkpoint["state_dict"])
        return cls(model, BPETokenizer.load(os.path.join(folder, TOKENIZER_FILE)), device)

    def get_sentence_embedding_dimension(self) -> int:
        return self.model.config.dim

    # Older sentence-transformers name, used by the model server's health check.
    get_embedding_dimension = get_sentence_embedding_dimension

    @torch.no_grad()
    def encode(self, texts: Sequence[str], batch_size: int = 32, normalize_embeddings: bool = True,
               show_progress_bar: bool = False, **_ignored) -> torch.Tensor:
        vectors: List[torch.Tensor] = []
        for start in range(0, len(texts), batch_size):
            ids, mask = batch_ids(self.tok, texts[start:start + batch_size], self.model.config.max_len)
            vectors.append(self.model(ids.to(self.device), mask.to(self.device)).cpu())
        out = torch.cat(vectors) if vectors else torch.zeros((0, self.model.config.dim))
        # The encoder always returns unit vectors, so normalize_embeddings is already satisfied.
        return out
