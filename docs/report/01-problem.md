# 1. Problem and motivation

> Draft by Sambit. Replace the **[bracketed]** parts once final numbers exist.

## The problem

Recruiters screening for a single role often receive hundreds of resumes. Reading each one carefully is slow, and keyword filters (the usual shortcut) miss good candidates who describe their skills in different words, while rewarding resumes stuffed with keywords. Screening is also where bias can creep in, consciously or not.

HireLabs is a private resume workspace that helps a recruiter **parse** resumes, **rank** them against a job description, and get an **explained evaluation** of each candidate, while keeping the human in charge of the decision.

## Why "just calling an AI API" was not enough

Our first version sent resume text to a large hosted model (Google Gemini) and displayed the answer. It worked, but:

1. **It wasn't our work.** The intelligence lived entirely in someone else's model; our contribution was a web page around it.
2. **It couldn't be measured.** We had no way to say *how good* it was, or whether a change made it better or worse.
3. **It's costly and not private.** Every resume, which is personal data, was sent to an external paid service.
4. **It's a black box for fairness.** We couldn't show whether a candidate's name or gender affected their score.

## What we did instead

We built and trained our own models for the core tasks. No external AI service runs in the product: there is no Gemini code in the website any more.

| Task | Our model | Owner |
|---|---|---|
| Resume parsing | `hirelabs-parser`: a spaCy named-entity model trained on [N] resumes we labelled ourselves, with rule-based clean-up and gap filling | Pushpita |
| Matching | `hirelabs-matcher`: an embedding model fine-tuned on [N] resume–job pairs | Sagnik |
| Fit language model | `hirelabs-llm`: a 2M-parameter GPT built and trained **from scratch** (own tokenizer, random initialisation, no labels) on the team's resume and job text | Sambit |
| Candidate evaluation | `hirelabs-explainer`: skill-by-skill evidence from the resume plus a fit score combining skill coverage (55%), `hirelabs-matcher` (30%) and `hirelabs-llm` (15%) | Sambit |
| Candidate evaluation (optional) | `hirelabs-evaluator`: a [base model, size] LLM fine-tuned with QLoRA on [N] examples, off by default (`EVALUATOR_PROVIDER=ollama`) | Hrittima |

All models run on the team's private Hugging Face Space, so the live site needs no team member's laptop. See section 5 for `hirelabs-llm` and `hirelabs-explainer`.

Each model was evaluated on a **held-out test set** that was never used for training, and compared against a simple keyword baseline and against Gemini (section 7). We also ran a **fairness check** (section 8).

## Goals

1. Our own trained models, running inside the product.
2. Every score explained with evidence from the resume.
3. Measured results on unseen data, reported honestly, including where we lose.
4. A fairness check showing that name and gender don't change the score.
5. Human decision-making preserved: HireLabs supports review and doesn't replace it.
