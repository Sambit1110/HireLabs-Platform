"""Explicit adapters for Mayukh's development runner. See the fairness report."""

import os

from scripts.eval.adapters import CallableAdapter
from scripts.eval.bias_check import request_analysis_result


def parser():
    import spacy

    package = os.getenv("PARSER_MODEL") or os.getenv("HIRELABS_PARSER_MODEL", "hirelabs_parser")
    pipeline = spacy.load(package)

    def predict(row):
        return [{"start": ent.start_char, "end": ent.end_char, "label": ent.label_}
                for ent in pipeline(row["text"]).ents]

    return CallableAdapter("hirelabs-parser", predict, model_id=package)


def matcher():
    from sentence_transformers import SentenceTransformer

    path = os.getenv("MATCHER_MODEL") or os.getenv("MATCHER_MODEL_PATH", "models/hirelabs-matcher")
    model = SentenceTransformer(path, local_files_only=True)
    if model.get_sentence_embedding_dimension() != 384:
        raise ValueError("Expected a 384-dimensional HireLabs matcher.")

    def rank(row):
        candidates = row["candidates"]
        texts = [row["job_description"], *(item["text"] for item in candidates)]
        vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        scores = vectors[1:] @ vectors[0]
        return [item["id"] for item, _ in sorted(zip(candidates, scores, strict=True),
                                                key=lambda pair: (-pair[1], pair[0]["id"]))]

    return CallableAdapter("hirelabs-matcher", rank, model_id=path)


def evaluator(provider):
    token = os.environ["HIRELABS_ACCESS_TOKEN"]
    url = "http://127.0.0.1:3000/api/ai-analyze"
    model = (os.getenv("BIAS_EXPECTED_LOCAL_MODEL", "hirelabs-evaluator") if provider == "local"
             else os.getenv("GEMINI_MODEL", "gemini-fallback"))

    def predict(row):
        case = {"role": "Role described in the supplied job description",
                "jobDescription": row["job_description"]}
        return request_analysis_result(url, token, provider, case, {"parsedText": row["resume_text"]})

    return CallableAdapter(model, predict)


def configured():
    factories = {"spacy_parser": parser, "hirelabs_matcher": matcher,
                 "hirelabs_evaluator": lambda: evaluator("local"),
                 "gemini_evaluator": lambda: evaluator("gemini")}
    selected = os.getenv("HIRELABS_EVAL_ADAPTERS", "").split(",")
    names = [name.strip() for name in selected]
    if not all(name in factories for name in names):
        raise ValueError("Set HIRELABS_EVAL_ADAPTERS to comma-separated keys from " + ", ".join(factories))
    return {name: factories[name]() for name in names}
