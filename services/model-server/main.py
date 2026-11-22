import os
from contextlib import asynccontextmanager
from pathlib import Path
import sys

from fastapi import FastAPI, HTTPException, Request, Response
from pydantic import BaseModel, Field, StringConstraints
from typing import Annotated

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "python"))
from resume_parser import parse_profile


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.placeholder = os.getenv("MODEL_PLACEHOLDERS") == "true"
    app.state.parser = None
    app.state.matcher = None
    if not app.state.placeholder:
        import spacy
        from sentence_transformers import SentenceTransformer

        try:
            app.state.parser = spacy.load(os.getenv("PARSER_MODEL") or os.getenv("HIRELABS_PARSER_MODEL", "hirelabs_parser"))
        except (OSError, ImportError):
            print("HireLabs parser unavailable.", file=sys.stderr)
        try:
            app.state.matcher = SentenceTransformer(
                os.getenv("MATCHER_MODEL") or os.getenv("MATCHER_MODEL_PATH", "models/hirelabs-matcher"), local_files_only=True
            )
        except (OSError, ValueError):
            print("HireLabs matcher unavailable.", file=sys.stderr)
    yield


app = FastAPI(lifespan=lifespan)


class ParseInput(BaseModel):
    text: str = Field(min_length=1, max_length=50000)


EmbeddingText = Annotated[str, StringConstraints(min_length=1, max_length=12000)]


class EmbedInput(BaseModel):
    texts: list[EmbeddingText] = Field(min_length=1, max_length=16)


@app.get("/health")
def health(request: Request):
    state = request.app.state
    parser_ready = state.parser is not None
    matcher_ready = state.matcher is not None and state.matcher.get_sentence_embedding_dimension() == 384
    return {"parser_ready": parser_ready, "matcher_ready": matcher_ready, "placeholder": state.placeholder}


@app.post("/parse")
def parse(body: ParseInput, request: Request, response: Response):
    if not body.text.strip():
        raise HTTPException(422, "Resume text is required.")
    state = request.app.state
    if state.placeholder:
        response.headers["X-HireLabs-Placeholder"] = "true"
        return {"candidateName": "Sample Candidate", "candidateTitle": "Sample Role",
                "extractedSkills": [], "yearsExperience": None}
    if state.parser is None:
        raise HTTPException(503, "Parser unavailable.")
    return parse_profile(body.text, state.parser)


@app.post("/embed")
def embed(body: EmbedInput, request: Request, response: Response):
    if any(not text.strip() for text in body.texts):
        raise HTTPException(422, "Embedding text is required.")
    state = request.app.state
    if state.placeholder:
        response.headers["X-HireLabs-Placeholder"] = "true"
        return {"vectors": [[0.0] * 384 for _ in body.texts], "dim": 384}
    if state.matcher is None or state.matcher.get_sentence_embedding_dimension() != 384:
        raise HTTPException(503, "384-dimensional matcher unavailable.")
    vectors = state.matcher.encode(body.texts, normalize_embeddings=True)
    return {"vectors": vectors.tolist(), "dim": 384}
