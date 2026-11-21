# HireLabs — Team Plan (read this first)

**Goal:** turn HireLabs from "a website that calls Gemini" into a project with **our own trained models**, **measured results**, and a **fairness check**. Every claim we make to the teacher must come with a number or a screenshot.

## Who owns what

| Member | Owns | Task file |
|---|---|---|
| Hrittima | Fine-tuned LLM (`hirelabs-evaluator`) | [hrittima.md](hrittima.md) |
| Sagnik | Matching model (`hirelabs-matcher`) + pgvector + match API | [sagnik.md](sagnik.md) |
| Pushpita | Dataset + held-out test set + our own resume parser (`hirelabs-parser`) | [pushpita.md](pushpita.md) |
| Mayukh | Evaluation: comparison table, error analysis, automated tests | [mayukh.md](mayukh.md) |
| Arpan | Model serving in the app + bias check + hardening | [arpan.md](arpan.md) |
| Sambit | Frontend (scores explained, results page) + integration + demo | — |

## Timeline

Adjust the dates if our deadline is different.

| Week | Dates | Everyone |
|---|---|---|
| 1 | Nov 23 – Nov 29 | **Data week.** Pushpita sets up the dataset and Label Studio; **each person labels 50 resumes**. Everyone records the "before" numbers for their part. |
| 2 | Nov 30 – Dec 6 | Build and train your own part. |
| 3 | Dec 7 – Dec 13 | Finish models, hand them to Arpan, wire them into the app. |
| 4 | Dec 14 – Dec 20 | Mayukh runs final evaluation, fix gaps, write your report section, rehearse the demo. |

## How the parts connect

```
Pushpita (data) ──► Hrittima (LLM) ──┐
               ├──► Sagnik (matcher) ─┼──► Arpan (serving + API) ──► Sambit (dashboard + demo)
               ├──► Pushpita (parser) ┘                 ▲
               └──► Mayukh (test set + evaluation) ─────┴──► numbers for the results page + report
```

## Shared data formats (agree on these in week 1 — do not change them silently)

**Where data lives:** a shared Google Drive folder `HireLabs-Data/`, **not git** (too big, and it contains resume text). Only small samples (≤ 5 examples) go into the repo under `data/samples/`.

```
HireLabs-Data/
  raw/resumes/r_0001.txt …      plain text, cleaned with the same cleaner the app uses
  raw/jds/j_0001.txt …
  parser/train.jsonl, dev.jsonl
  pairs/train.jsonl, dev.jsonl
  test/   🔒 LOCKED — parser_test.jsonl, pairs_test.jsonl (only Mayukh runs models on these)
```

**1. Parser example** (`parser/*.jsonl`, one per line)
```json
{"id": "r_0001", "text": "Jane Doe\nBackend Engineer ...", "entities": [{"start": 0, "end": 8, "label": "NAME"}]}
```
Labels: `NAME`, `TITLE`, `SKILL`, `YEARS_EXPERIENCE`, `DEGREE`, `COMPANY`.

**2. Resume–job pair** (`pairs/*.jsonl`)
```json
{"pair_id": "p_0001", "resume_id": "r_0001", "jd_id": "j_0042", "fit_score": 78, "fit_verdict": "strong", "label_source": "human"}
```
- `fit_verdict` bands: `strong` = 75–100, `moderate` = 50–74, `weak` = 0–49, `insufficient_evidence` = the resume doesn't contain enough information.
- `label_source`: `human`, `gemini_checked` (Gemini proposed it and a human checked it), or `category` (weak label from the dataset category).

**3. LLM output:** the same JSON the app already returns from `app/api/ai-analyze/route.js` (candidate mode: `fit_verdict`, `confidence`, `strengths`, `gaps`, `evidence_signals`, `skill_gap_analysis`, `recruiter_insights`, …) **plus one new field `fit_score` (0–100)**. This keeps Sambit's UI working unchanged.

**4. Model service (Arpan runs it, everyone else targets it)**

| Call | Request | Response |
|---|---|---|
| `POST http://localhost:8000/parse` | `{"text": "..."}` | `{"candidateName", "candidateTitle", "extractedSkills", "yearsExperience"}` (same shape as `lib/resume/model-parser.js`) |
| `POST http://localhost:8000/embed` | `{"texts": ["...", "..."]}` | `{"vectors": [[...], [...]], "dim": 384}` |
| Ollama `http://localhost:11434` | model name `hirelabs-evaluator` | LLM output JSON (format 3) |

Every HireLabs API response gets a `model_used` field (e.g. `"hirelabs-evaluator"` or `"gemini-fallback"`) so the dashboard can show which model answered.

## Ground rules

1. **The test set is locked.** Nobody trains or tunes on `test/`. Tune on `dev`. Mayukh runs each final model on `test` once, at the end.
2. **Every claim needs a number or a screenshot.** "Better" gets no marks; "0.84 F1 vs 0.71" does.
3. **Be honest about Gemini's help.** If Gemini helped create labels or training targets, say so in the report ("knowledge distillation + human checking"). Teachers respect that; they punish getting caught.
4. **No real people's resumes** without their consent. Use public datasets.
5. **Never commit** `.env`, API keys, model weights (`.gguf`, `.whl`, `.safetensors`) or the dataset. Share weights through Drive or the Hugging Face Hub.
6. **Git:** work on a branch `feature/<name>-<topic>`, open a pull request, and Sambit merges. Commit messages must say what actually changed (no more "added llm model" for a type fix).
7. Keep `npm run check` (lint + typecheck + tests) passing on every PR.

## Report structure (each person writes their own section)

1. Problem and why API-only wasn't enough — Sambit
2. Dataset — Pushpita
3. Resume parser — Pushpita
4. Matching model — Sagnik
5. Evaluator LLM — Hrittima
6. System architecture and serving — Arpan
7. Results and error analysis — Mayukh
8. Fairness check — Arpan
9. Product demo and UI — Sambit
