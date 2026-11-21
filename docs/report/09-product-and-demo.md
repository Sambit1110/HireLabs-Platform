# 9. Product and user interface

> Draft by Sambit. Add screenshots marked **[screenshot]** from the final build. Use real data, never the SAMPLE previews.

## Design principles

- **Show the reasons, not just a number.** A score alone invites blind trust. Every evaluation shows the matched skills, the missing skills and the resume evidence behind the score.
- **Always say which model answered.** Every AI result carries a badge: green **"Our model"** (`hirelabs-parser`, `hirelabs-matcher`, `hirelabs-evaluator`) or grey **"Gemini fallback"**.
- **Never invent certainty.** If the model returns `insufficient_evidence`, the UI shows "Not scored" instead of a number. Missing data is shown as missing, never filled in.
- **Keep humans in charge.** Every screen states that AI output is decision support and should be verified.

## Main screens

### Dashboard overview (`/dashboard`)
Upload resumes (PDF/DOCX), see parsing status, search and filter candidates, and compare up to three side by side. **[screenshot]**

### Rank candidates for a job
Paste a job description. HireLabs embeds it with `hirelabs-matcher` and ranks the user's parsed resumes by similarity, shown as a percentage bar. Each row has an **Explain score** button. **[screenshot]**

### Candidate evaluation
Clicking **Explain score** fills in the job and candidate, and the evaluation shows:
- the fit score (0–100) and verdict, with the model's confidence
- **Matched skills** (green) vs **Missing skills** (red), plus skills claimed without evidence
- **Evidence from the resume**, quoted
- strengths, gaps, risk flags, suggested interview questions and a recommendation

**[screenshot]**

### Model results (`/dashboard/results`)
The comparison table from section 7 (keyword baseline vs Gemini vs our models, on the held-out test set), with the best value per metric highlighted, a bar chart per metric, and the fairness table from section 8. The page reads `public/model-results.json`, which the evaluation script writes, so the numbers on screen are exactly the measured ones. **[screenshot]**

## Implementation notes

| Piece | File |
|---|---|
| Model badge | `components/dashboard/ModelBadge.tsx`, `lib/ai/model-info.js` |
| Explanation view | `components/dashboard/CandidateEvaluation.tsx`, `lib/ai/evaluation.js` |
| Ranking | `components/dashboard/CandidateRanking.tsx` (API contract: `docs/api/MATCH_CONTRACT.md`) |
| Results page | `components/dashboard/ModelResults.tsx`, `lib/eval/results.js` (format: `docs/results/RESULTS_FORMAT.md`) |

The display logic is covered by unit tests (`tests/dashboard-helpers.test.js`, `tests/model-results.test.js`), including the rule that "insufficient evidence" never shows a score.

## Demo

The live demo follows `docs/demo/DEMO_SCRIPT.md`: upload → parse → rank → explain → results → fairness → fallback.
