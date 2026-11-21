# HireLabs: final demo script (5–7 minutes)

**Presenter:** Sambit (each owner can take over their own step).
**Goal:** show the teacher that HireLabs runs *our own trained models*, explains every score, and is measured and checked for fairness.

## Before the demo (checklist)

- [ ] `main` is up to date and `npm run check` passes.
- [ ] Model server and Ollama are running locally, and `hirelabs-evaluator` is loaded (Arpan).
- [ ] `public/model-results.json` contains the **real** final numbers (Mayukh). **No SAMPLE banner anywhere.**
- [ ] Demo account signed in, with 5–8 parsed resumes from the **test set** (not training data) and 1 fresh resume ready to upload.
- [ ] One job description copied to the clipboard.
- [ ] Backup screen recordings of steps 2–7 on a USB stick and in Drive.
- [ ] Browser zoom at 125%, notifications off, other tabs closed.

## Script

| # | Time | Show | Say (key points) |
|---|---|---|---|
| 1 | 0:45 | Title slide → architecture diagram | "Our first version just sent resumes to Gemini, which anyone can build. So we trained our own models for the three core jobs (parsing, matching, scoring), measured them, and checked them for bias." |
| 2 | 1:00 | Dashboard → upload a resume | "Our own resume parser extracts the name, title and skills." Point at the **`hirelabs-parser`** badge. |
| 3 | 1:00 | "Rank candidates for a job" → paste the job description → Rank | "Our matching model ranks candidates by meaning, not just keywords." Point at the **`hirelabs-matcher`** badge and the similarity bars. |
| 4 | 1:15 | Click **Explain score** on the top candidate → Evaluate candidate | "Our fine-tuned LLM gives a score *with reasons*: matched skills, missing skills, and evidence quoted from the resume." Point at the **`hirelabs-evaluator`** badge. If the model says "insufficient evidence", say: "it refuses to guess." |
| 5 | 1:00 | Nav → **Model results** | Walk the table: keyword baseline vs Gemini vs ours, on a test set no model saw. Say honestly where Gemini still wins, and why ours is still worth it (free, private, runs locally). |
| 6 | 0:45 | Scroll to **Fairness check** | "We swapped only names and genders on identical resumes. Here's how much the score moved." If there's a before/after with names removed, show it. |
| 7 | 0:30 | Stop the model server → run the evaluation again | "If our model server is down, the app falls back to Gemini, and the badge tells you." |
| 8 | 0:30 | Closing slide | Team roles (one line each) and what we'd do next. |

## Likely teacher questions (who answers)

| Question | Who |
|---|---|
| "Where did the training data come from? How much?" | Pushpita (dataset card) |
| "Did you train it or download it?" | Hrittima (LLM), Sagnik (matcher), Pushpita (parser): show the notebooks and loss charts |
| "How do you know it's better?" | Mayukh (held-out test set, comparison table) |
| "Is it biased?" | Arpan (fairness check) |
| "Why use Gemini at all?" | Arpan: only as a fallback, and to help label data (knowledge distillation), checked by humans |
| "Can I try it?" | Sambit: hand over the laptop with the demo account |

## If something breaks

- A model call hangs → switch to the backup recording for that step and keep talking.
- The results page shows "No evaluation results yet" → `public/model-results.json` is missing. Show the table from the report slides instead.
