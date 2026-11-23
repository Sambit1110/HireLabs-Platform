# 5. Our own language model and the explainer

> Draft by Sambit. Full method and commands: [docs/hirelabs-llm.md](../hirelabs-llm.md).

## hirelabs-llm: a language model built from scratch

We wrote and trained a small GPT ourselves: a byte-level BPE tokenizer and a 4-layer decoder-only transformer with 2.02 million parameters, starting from random weights. Nothing was downloaded or fine-tuned, and no Gemini or human labels were used, because our only labels were Gemini-checked.

**Training text.** 700 train-split resumes and the 300 shared job descriptions. A job is paired with resumes of the same role, using the documents' own titles. To stop the model learning the dataset's single layout, training samples are varied by rules: title lines removed, lines dropped, lists shuffled, relabelled or turned into bullets, and lines merged into a paragraph. No model writes any text. Training takes 8.4 minutes on a laptop GPU.

**Scoring.** The match score is the pointwise mutual information between job and resume: how much more likely the model finds the resume after reading the job.

**Results on held-out dev resumes** (MRR, 300 jobs × 150 resumes, relevant = same role):

| | Full text | Titles removed | Shortened | Re-laid-out |
|---|---|---|---|---|
| hirelabs-llm v2 | **1.000** | 0.532 | **0.891** | **1.000** |
| Skill-overlap rule | 0.577 | **0.573** | 0.396 | 0.367 |

Where we lose: without titles the model is slightly behind a plain skill-overlap rule, and on free-text resumes unlike the dataset it is unreliable. The dataset has one layout, so real, varied resume text is the main next step.

## hirelabs-explainer: evaluations from our own models

**Explain score** and **role briefs** are produced by our own models plus transparent rules:

- **Skills.** The skills a job asks for come from its requirements, or from typical skills for the role (clearly marked "assumed") when it names fewer than three.
- **Evidence.** Each skill is looked up in the resume: shown in work (quoted word for word), related only, listed only, or missing. Every quote is checked against the resume before it is displayed.
- **Fit score.** Skill coverage (55%) + `hirelabs-matcher` similarity (30%) + `hirelabs-llm` (15%). The same number appears in Rank candidates and in Explain score, and the dashboard shows how it was built.

This trades fluent prose for statements that can all be traced to the resume, and it keeps the product within our rule of using only our own models.
