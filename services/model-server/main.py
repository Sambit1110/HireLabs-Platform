import hmac
import json
import os
import sys
import urllib.error
import urllib.request
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any, Dict, List, Literal, Optional, Union

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, StringConstraints

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "python"))
from resume_parser import parse_profile


@asynccontextmanager
async def lifespan(app: FastAPI):
    token = os.getenv("MODEL_API_TOKEN", "")
    if token and len(token) < 32:
        raise RuntimeError("MODEL_API_TOKEN must be at least 32 characters.")
    if not token:
        print("MODEL_API_TOKEN is not set: keep this server on 127.0.0.1 and never expose it.", file=sys.stderr)
    app.state.placeholder = os.getenv("MODEL_PLACEHOLDERS") == "true"
    app.state.parser = None
    app.state.matcher = None
    if not app.state.placeholder:
        try:
            import spacy

            app.state.parser = spacy.load(os.getenv("PARSER_MODEL") or os.getenv("HIRELABS_PARSER_MODEL", "hirelabs_parser"))
        except (OSError, ImportError):
            print("HireLabs parser unavailable.", file=sys.stderr)
        try:
            from sentence_transformers import SentenceTransformer

            app.state.matcher = SentenceTransformer(
                os.getenv("MATCHER_MODEL") or os.getenv("MATCHER_MODEL_PATH", "models/hirelabs-matcher"), local_files_only=True
            )
        except (ImportError, OSError, ValueError):
            print("HireLabs matcher unavailable.", file=sys.stderr)
    yield


app = FastAPI(lifespan=lifespan)

# Reachable without the token: readiness booleans only, for tunnel checks.
OPEN_PATHS = {"/health"}


@app.middleware("http")
async def require_token(request: Request, call_next):
    """With MODEL_API_TOKEN set, every request but /health needs `Authorization: Bearer <token>`."""
    token = os.getenv("MODEL_API_TOKEN", "")
    if token and request.url.path not in OPEN_PATHS:
        supplied = request.headers.get("authorization", "")
        if not hmac.compare_digest(supplied.encode(), f"Bearer {token}".encode()):
            return JSONResponse({"detail": "Unauthorized."}, status_code=401)
    return await call_next(request)


class ParseInput(BaseModel):
    text: str = Field(min_length=1, max_length=50000)


EmbeddingText = Annotated[str, StringConstraints(min_length=1, max_length=50000)]


class EmbedInput(BaseModel):
    texts: list[EmbeddingText] = Field(min_length=1, max_length=128)


def ollama_base():
    return os.getenv("OLLAMA_UPSTREAM", "http://127.0.0.1:11434").rstrip("/")


def fetch_ollama_models():
    """Names of the models loaded in the local Ollama, e.g. ["hirelabs-evaluator:latest"]."""
    with urllib.request.urlopen(urllib.request.Request(f"{ollama_base()}/api/tags"), timeout=2) as reply:
        return [model.get("name", "") for model in json.loads(reply.read()).get("models", [])]


def evaluator_ready():
    """True when Ollama answers and has OLLAMA_MODEL (any tag) loaded."""
    model = os.getenv("OLLAMA_MODEL", "hirelabs-evaluator")
    try:
        names = fetch_ollama_models()
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return False
    return any(name == model or name.startswith(f"{model}:") for name in names)


@app.get("/health")
def health(request: Request):
    state = request.app.state
    parser_ready = state.parser is not None
    matcher_ready = state.matcher is not None and state.matcher.get_sentence_embedding_dimension() == 384
    return {
        "parser_ready": parser_ready,
        "matcher_ready": matcher_ready,
        "placeholder": state.placeholder,
        "evaluator_ready": evaluator_ready(),
    }


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
        return {
            "vectors": [[0.0] * 384 for _ in body.texts],
            "dim": 384,
            "model_used": "matcher-placeholder",
        }

    matcher = state.matcher
    if matcher is None or matcher.get_sentence_embedding_dimension() != 384:
        raise HTTPException(503, "384-dimensional matcher unavailable.")

    vectors = matcher.encode(
        body.texts, normalize_embeddings=True, show_progress_bar=False
    )
    return {
        "vectors": vectors.tolist(),
        "dim": 384,
        "model_used": "hirelabs-matcher",
    }


# ---------------------------------------------------------------- evaluator proxy
# Ollama has no authentication, so it stays on 127.0.0.1 and the app reaches it
# through this route: same token, one tunnel, and only the HireLabs evaluator.

ALLOWED_OPTIONS = {"temperature", "seed", "num_ctx"}
MAX_PROMPT_CHARS = 200_000


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(max_length=MAX_PROMPT_CHARS)


class ChatInput(BaseModel):
    model: str = Field(max_length=200)
    messages: List[ChatMessage] = Field(min_length=1, max_length=8)
    format: Optional[Union[Dict[str, Any], str]] = None
    options: Dict[str, Any] = Field(default_factory=dict)
    stream: bool = False


def forward_to_ollama(payload):
    """POST to the local Ollama chat API and return its JSON reply."""
    request = urllib.request.Request(
        f"{ollama_base()}/api/chat",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=float(os.getenv("OLLAMA_UPSTREAM_TIMEOUT", "58"))) as reply:
        return json.loads(reply.read())


@app.post("/api/chat")
def chat(body: ChatInput):
    model = os.getenv("OLLAMA_MODEL", "hirelabs-evaluator")
    if body.model != model:
        raise HTTPException(403, "Only the HireLabs evaluator can be used.")
    if sum(len(message.content) for message in body.messages) > MAX_PROMPT_CHARS:
        raise HTTPException(413, "Prompt too long.")
    options = {key: value for key, value in body.options.items() if key in ALLOWED_OPTIONS}
    max_ctx = int(os.getenv("OLLAMA_MAX_CTX", "32768"))
    num_ctx = options.get("num_ctx")
    if num_ctx is not None and (not isinstance(num_ctx, int) or not 512 <= num_ctx <= max_ctx):
        raise HTTPException(422, f"num_ctx must be between 512 and {max_ctx}.")

    payload = {
        "model": model,
        "messages": [message.model_dump() for message in body.messages],
        "stream": False,
        "options": options,
    }
    if body.format is not None:
        payload["format"] = body.format
    try:
        reply = forward_to_ollama(payload)
    except (urllib.error.URLError, TimeoutError, ValueError):
        raise HTTPException(503, "Evaluator unavailable.")
    return {"model": reply.get("model", model), "message": reply.get("message"), "done": reply.get("done", True)}
