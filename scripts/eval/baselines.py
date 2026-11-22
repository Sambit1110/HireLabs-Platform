"""Deterministic, explicitly untrained keyword baselines.

The canonical skill names and matching policy mirror the project's
``lib/resume/skills.js`` and ``lib/resume/matching.js`` conventions. Baseline
results are not evidence of model quality; they are only functions to evaluate
on an authorized, labeled split.
"""

import math
import re

# (canonical name, aliases, case-sensitive canonical phrase)
_SKILLS = (
    ("JavaScript", ("js", "es6", "ecmascript"), False),
    ("TypeScript", ("ts",), False), ("Python", (), False), ("Java", (), False),
    ("C++", ("cpp",), False), ("C#", ("csharp",), False),
    ("Go", ("golang",), True), ("Rust", (), False), ("PHP", (), False),
    ("Ruby", (), False), ("Ruby on Rails", ("rails", "ror"), False),
    ("Kotlin", (), False), ("Swift", (), True), ("SQL", (), False),
    ("React", ("reactjs", "react.js"), False), ("Next.js", ("nextjs", "next js"), False),
    ("Vue", ("vue.js", "vuejs"), False), ("Angular", ("angularjs",), False),
    ("Svelte", ("sveltekit",), False), ("HTML", ("html5",), False),
    ("CSS", ("css3",), False), ("Tailwind CSS", ("tailwind", "tailwindcss"), False),
    ("Node.js", ("node", "nodejs", "node js"), False),
    ("Express", ("express.js", "expressjs"), True), ("NestJS", ("nest.js",), False),
    ("FastAPI", (), False), ("Django", (), False), ("Flask", (), False),
    ("REST API", ("rest apis", "restful api", "restful apis", "restful"), False),
    ("GraphQL", (), False), ("WebSockets", ("websocket", "web sockets"), False),
    ("Microservices", ("microservice",), False),
    ("PostgreSQL", ("postgres", "psql"), False), ("MySQL", (), False),
    ("MongoDB", ("mongo",), False), ("Redis", (), False), ("SQLite", (), False),
    ("Supabase", (), False), ("Firebase", (), False), ("pgvector", (), False),
    ("AWS", ("amazon web services",), False), ("Azure", ("microsoft azure",), False),
    ("GCP", ("google cloud", "google cloud platform"), False),
    ("Cloud Architecture", ("cloud architect",), False), ("Docker", (), False),
    ("Kubernetes", ("k8s",), False), ("Terraform", (), False), ("Vercel", (), False),
    ("GitHub Actions", (), False), ("CI/CD", ("cicd", "continuous integration"), False),
    ("Linux", (), False), ("Git", (), False),
    ("Machine Learning", ("ml",), False), ("Deep Learning", (), False),
    ("NLP", ("natural language processing",), False), ("Computer Vision", (), False),
    ("PyTorch", (), False), ("TensorFlow", (), False),
    ("scikit-learn", ("sklearn",), False), ("Pandas", (), False), ("NumPy", (), False),
    ("Apache Spark", ("pyspark",), False), ("Kafka", ("apache kafka",), False),
    ("Airflow", ("apache airflow",), False), ("LangChain", (), False),
    ("RAG", ("retrieval augmented generation",), False),
    ("LLM", ("llms", "large language model", "large language models"), False),
    ("Generative AI", ("genai", "gen ai"), False), ("Gemini", (), False),
    ("OpenAI", (), False), ("Embeddings", ("embedding", "vector embeddings"), False),
    ("Vector Search", ("vector database", "vector databases", "similarity search"), False),
    ("HNSW", (), False), ("Prompt Engineering", (), False),
    ("Fine-tuning", ("finetuning", "fine tuning"), False),
    ("OAuth", ("oauth2", "oauth 2.0"), False), ("JWT", ("json web token", "json web tokens"), False),
    ("Row Level Security", ("rls", "row-level security"), False),
    ("Agile", (), False), ("Scrum", (), False),
)

_STOP_WORDS = {
    "about", "above", "across", "after", "also", "able", "ability", "candidate",
    "candidates", "company", "deliver", "desired", "develop", "developing", "each",
    "engineer", "engineers", "engineering", "ensure", "environment", "experience",
    "experienced", "from", "good", "great", "have", "help", "ideal", "including",
    "into", "join", "knowledge", "looking", "more", "must", "need", "needed", "other",
    "plus", "preferred", "required", "requirements", "responsible", "role", "should",
    "skills", "strong", "team", "teams", "that", "their", "them", "they", "this",
    "through", "understanding", "using", "very", "what", "when", "where", "which",
    "while", "will", "with", "within", "work", "working", "years", "your", "you",
    "senior", "junior", "lead", "level", "hands", "solid", "excellent", "building",
    "build",
}
_TITLES = (
    "software engineer", "software developer", "full stack engineer", "full-stack engineer",
    "frontend engineer", "backend engineer", "data scientist", "data engineer",
    "machine learning engineer", "ml engineer", "ai engineer", "devops engineer",
    "cloud engineer", "cloud architect", "solutions architect", "product manager",
    "project manager", "security engineer", "cybersecurity engineer", "web developer",
    "android developer", "ios developer", "qa engineer", "test engineer", "research scientist",
)
_NAME_LINE_EXCLUSIONS = re.compile(
    r"resume|curriculum|vitae|experience|education|skills|profile|summary|contact|email|phone|github|linkedin",
    re.IGNORECASE,
)
_TOKEN_RE = re.compile(r"[^a-z0-9+#.]+")


def normalize_tokens(value):
    text = str(value or "").lower().replace("'", "").replace("\u2018", "").replace("\u2019", "")
    return [token.strip(".") for token in _TOKEN_RE.split(text) if token.strip(".")]


def _phrase_pattern(phrase, case_sensitive=False):
    escaped = re.escape(phrase).replace(r"\ ", r"\s+")
    return re.compile(r"(?<![A-Za-z0-9])" + escaped + r"(?![A-Za-z0-9+#-])", 0 if case_sensitive else re.IGNORECASE)


def find_skill_spans(text):
    """Return non-overlapping exact character spans for every catalog mention."""
    if not isinstance(text, str) or not text:
        return []
    candidates = []
    for canonical, aliases, sensitive in _SKILLS:
        phrases = {canonical, *aliases}
        for phrase in phrases:
            case_sensitive = sensitive and phrase == canonical
            for match in _phrase_pattern(phrase, case_sensitive).finditer(text):
                candidates.append((match.start(), match.end(), canonical))
    candidates.sort(key=lambda item: (-(item[1] - item[0]), item[0], item[2]))
    accepted = []
    for candidate in candidates:
        start, end, _ = candidate
        if any(start < other_end and end > other_start for other_start, other_end, _ in accepted):
            continue
        accepted.append(candidate)
    return [
        {"start": start, "end": end, "label": "SKILL"}
        for start, end, _ in sorted(accepted, key=lambda item: (item[0], item[1]))
    ]


def extract_skills(text):
    """Return canonical detected skill names in the shared catalog order."""
    found = set()
    if not isinstance(text, str):
        return []
    for canonical, aliases, sensitive in _SKILLS:
        for phrase in {canonical, *aliases}:
            if _phrase_pattern(phrase, sensitive and phrase == canonical).search(text):
                found.add(canonical)
                break
    return [name for name, _, _ in _SKILLS if name in found]


def parser_keyword_baseline(text):
    """Extract only defensible NAME, TITLE, SKILL, and duration spans.

    No baseline prediction is emitted for DEGREE or COMPANY because the
    lightweight heuristics here do not have defensible rules for those labels.
    """
    if not isinstance(text, str):
        return []
    spans = find_skill_spans(text)

    offset = 0
    for line in text.splitlines(keepends=True):
        stripped = line.strip()
        leading = len(line) - len(line.lstrip())
        if (3 <= len(stripped) <= 60 and not _NAME_LINE_EXCLUSIONS.search(stripped)
                and not re.search(r"[@\d]", stripped)):
            words = stripped.split()
            if 2 <= len(words) <= 5 and all(re.fullmatch(r"[A-Za-z.'-]+", word) for word in words):
                start = offset + leading
                spans.append({"start": start, "end": start + len(stripped), "label": "NAME"})
                break
        offset += len(line)

    for title in _TITLES:
        pattern = re.compile(r"(?<![A-Za-z])" + re.escape(title).replace(r"\ ", r"\s+") + r"(?![A-Za-z])", re.IGNORECASE)
        for match in pattern.finditer(text):
            spans.append({"start": match.start(), "end": match.end(), "label": "TITLE"})

    experience_patterns = (
        re.compile(
            r"\b\d{1,2}\s*\+?\s*(?:years?|yrs?)(?=\s+(?:of\s+)?(?:professional\s+)?experience\b)",
            re.IGNORECASE,
        ),
        re.compile(
            r"\b(?:professional\s+)?experience\s*[:\-]\s*(\d{1,2}\s*\+?\s*(?:years?|yrs?))\b",
            re.IGNORECASE,
        ),
    )
    experience_spans = set()
    for pattern in experience_patterns:
        for match in pattern.finditer(text):
            start, end = match.span(1) if match.lastindex else match.span()
            experience_spans.add((start, end))
    for start, end in sorted(experience_spans):
        spans.append({"start": start, "end": end, "label": "YEARS_EXPERIENCE"})
    return sorted(spans, key=lambda item: (item["start"], item["end"], item["label"]))


def extract_requirements(role, job_description):
    text = f"{role or ''}\n{job_description or ''}"
    skills = extract_skills(text)
    if skills:
        return "skills", skills
    keywords = []
    for token in normalize_tokens(text):
        if len(token) < 4 or not re.fullmatch(r"[a-z]+", token) or token in _STOP_WORDS:
            continue
        if token not in keywords:
            keywords.append(token)
        if len(keywords) >= 15:
            break
    return ("keywords", keywords) if keywords else ("none", [])


def keyword_match_score(resume_text, job_description, *, role="", title="", extracted_skills=()):
    """Mirror the app's deterministic skill overlap and keyword fallback."""
    requirement_type, requirements = extract_requirements(role, job_description)
    if not requirements:
        return {"score": 0, "matched": [], "missing": [], "total": 0, "requirement_type": "none"}
    evidence = set(extract_skills(resume_text))
    for skill in extracted_skills or ():
        evidence.update(extract_skills(str(skill)))
    if requirement_type == "keywords":
        candidate_tokens = set(normalize_tokens(f"{title or ''} {resume_text}"))
        candidate_tokens.update(normalize_tokens(" ".join(str(item) for item in (extracted_skills or ()))))
        matched = [item for item in requirements if item in candidate_tokens]
    else:
        matched = [item for item in requirements if item in evidence]
    missing = [item for item in requirements if item not in matched]
    score = math.floor(100 * len(matched) / len(requirements) + 0.5)
    return {
        "score": score,
        "matched": matched,
        "missing": missing,
        "total": len(requirements),
        "requirement_type": requirement_type,
    }


def rank_candidates(candidates, job_description, *, role="", top_k=None):
    """Rank candidate records deterministically by overlap then candidate ID.

    Expected candidate fields are ``id``, ``text`` and optional ``title`` and
    ``skills``. Ties are always resolved by ascending, case-sensitive ID.
    """
    if top_k is not None and (type(top_k) is not int or top_k <= 0):
        raise ValueError("top_k must be a positive integer or None.")
    seen_ids = set()
    ranked = []
    for candidate in candidates:
        if not isinstance(candidate, dict):
            raise ValueError("Each candidate must be an object.")
        candidate_id = candidate.get("id")
        if not isinstance(candidate_id, str) or not candidate_id.strip():
            raise ValueError("Each candidate requires a non-empty ID.")
        if candidate_id in seen_ids:
            raise ValueError("Candidate IDs must be unique.")
        seen_ids.add(candidate_id)
        resume_text = candidate.get("text", "")
        if not isinstance(resume_text, str):
            raise ValueError("Candidate text must be a string.")
        skills = candidate.get("skills", ())
        if not isinstance(skills, (list, tuple)):
            raise ValueError("Candidate skills must be a list or tuple.")
        score = keyword_match_score(
            resume_text,
            job_description,
            role=role,
            title=candidate.get("title", ""),
            extracted_skills=skills,
        )
        ranked.append({"id": candidate_id, **score})
    ranked.sort(key=lambda item: (-item["score"], item["id"]))
    return ranked[:top_k] if top_k is not None else ranked


def evaluator_keyword_baseline(resume_text, job_description, *, role="", title="", extracted_skills=()):
    """Map required-skill overlap to the shared verdict bands."""
    result = keyword_match_score(
        resume_text, job_description, role=role, title=title, extracted_skills=extracted_skills
    )
    if result["total"] == 0:
        verdict, fit_score = "insufficient_evidence", None
    else:
        fit_score = result["score"]
        verdict = "strong" if fit_score >= 75 else "moderate" if fit_score >= 50 else "weak"
    return {**result, "fit_score": fit_score, "fit_verdict": verdict}
