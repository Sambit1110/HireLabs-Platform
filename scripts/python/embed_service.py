#!/usr/bin/env python3
"""
HireLabs - Embedding Service (Deliverable to Arpan)
FastAPI microservice exposing POST /embed as required by the Shared Plan:
  POST http://localhost:8000/embed
  Body:     {"texts": ["text1", "text2", ...]}
  Response: {"vectors": [[...], [...]], "dim": 384}

Model: hirelabs-matcher (384 dimensions)
"""

import os
from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import uvicorn

DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "models",
    "hirelabs-matcher",
)
FALLBACK_MODEL = "BAAI/bge-small-en-v1.5"
DIMENSION = 384

app = FastAPI(
    title="HireLabs Matching & Embedding Service",
    description="384-dimensional dense semantic embedding service for HireLabs ATS.",
    version="1.0.0",
)

_model = None
_model_name = "hirelabs-matcher"


def get_embedding_model():
    global _model, _model_name
    if _model is None:
        from sentence_transformers import SentenceTransformer

        model_path = os.getenv("MATCHER_MODEL_PATH", DEFAULT_MODEL_PATH)
        if not os.path.exists(model_path):
            print(f"Notice: Local model at '{model_path}' not found, falling back to base model '{FALLBACK_MODEL}'")
            model_path = FALLBACK_MODEL
            _model_name = "bge-small-en-v1.5-baseline"
        else:
            _model_name = "hirelabs-matcher"

        print(f"Loading embedding model: {model_path} ...")
        _model = SentenceTransformer(model_path)
        print("Model loaded successfully.")
    return _model


class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., min_items=1, max_items=128, description="List of raw or cleaned texts to embed")


class EmbedResponse(BaseModel):
    vectors: List[List[float]] = Field(..., description="List of 384-dimensional embedding vectors")
    dim: int = Field(384, description="Vector dimension size")
    model_used: str = Field(..., description="Active model identifier")


@app.get("/health")
def health_check():
    get_embedding_model()
    return {
        "status": "healthy",
        "service": "hirelabs-matcher",
        "model_used": _model_name,
        "dim": DIMENSION,
    }


@app.post("/embed", response_model=EmbedResponse)
def embed_texts(payload: EmbedRequest):
    if not payload.texts:
        raise HTTPException(status_code=400, detail="texts array cannot be empty")

    model = get_embedding_model()
    embeddings = model.encode(
        payload.texts,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    vectors = [vec.tolist() for vec in embeddings]
    return EmbedResponse(
        vectors=vectors,
        dim=DIMENSION,
        model_used=_model_name,
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
