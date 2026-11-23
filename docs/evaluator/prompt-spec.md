# Evaluator prompt specification (`candidate-v3`)

Give this file, its repository revision and [`data/samples/evaluator/synthetic-example.json`](../../data/samples/evaluator/synthetic-example.json) to **both** GPT-6 sessions. The trainer (#1) and the evaluator (#2) must build model inputs the same way, so the same source pair always produces the same input.

- **Source of truth:** [`lib/ai/candidate-prompt.js`](../../lib/ai/candidate-prompt.js). The app (Gemini and the local `hirelabs-evaluator`), the dataset scripts and the tests all import it.
- **Prompt version:** `CANDIDATE_PROMPT_VERSION = 'candidate-v3'`. Every generated target and provenance row records it.
- **Repository revision:** use the commit that contains this file. Record it in the handoff as `git rev-parse HEAD` at the time of the data build.

## Model input: two messages

| Order | Role | Content |
|---|---|---|
| 1 | `system` | `CANDIDATE_SYSTEM_PROMPT`: fixed rules 1–15 and analysis requirements A–J. It is identical for every pair. |
| 2 | `user` | `buildCandidateUserMessage(body)`: the formatted job and resume (template below). |

A training record adds the expected output as message 3 (`assistant`): the target JSON, serialised with `JSON.stringify`. Gemini receives the same text as one prompt: `buildCandidatePrompt(body)` = system + blank line + user.

### Building `body` from a source pair (`sourceBody` in `lib/evaluator/dataset.js`)

```js
{
  mode: 'candidate',
  role: <first non-empty line of the job description>,
  jobDescription: <full job description text>,
  candidate: { parsedText: <full resume text>, name: null, title: null, skills: null, yearsExperience: null },
}
```

Names and parsed fields are deliberately left out (they render as `Not provided` / `Unknown`). The model judges the resume text itself, which also keeps names out of training data.

### User message template

```
TARGET ROLE:
<role, max 300 chars>

JOB DESCRIPTION:
<job description, max 12000 chars>

CANDIDATE INFORMATION:

Name:
Not provided

Title:
Not provided

Extracted skills:
Not provided

Years of experience:
Unknown

RESUME TEXT:
<resume text, max 30000 chars>
```

Each value is trimmed and clipped to the limit shown.

## Expected output (format 3 in the shared plan)

The candidate JSON the app already returns, with `fit_score`. The schema is `candidateSchema`:

- **Strings:** `candidate_summary`, `relevant_experience_summary`, `recommendation`.
- **Lists of strings** (at most 30 items each): `technical_strengths`, `relevant_projects`, `strengths`, `gaps`, `evidence_signals`, `risk_flags`, `interview_questions`.
- **Verdict and scores:**
  - `fit_verdict`: `strong` | `moderate` | `weak` | `insufficient_evidence`
  - `fit_score`: integer 0–100
  - `confidence`: integer 0–100, meaning confidence in the evidence, not the chance of success
- **`skill_gap_analysis`:** `demonstrated_skills`, `partially_demonstrated_skills`, `missing_required_skills`, `missing_preferred_skills`, `unverified_skills` (lists) and `skill_gap_summary` (string).
- **`recruiter_insights`:** `strongest_alignment`, `areas_for_verification`, `suggested_interview_focus` (lists) and `overall_assessment` (string).

**Score bands:** `strong` is 75–100, `moderate` 50–74, and `weak` 0–49. `insufficient_evidence` is a separate verdict for when the resume cannot be assessed, and can go with any score. `validateAnalysis` enforces the bands.

## Quality rules for training targets (`targetFlags`)

- **Errors** make a target unusable: it fails the schema, or its score falls outside its verdict band.
- **Warnings** send a target to human review before training:
  - `missing_evidence_not_explained`: a skill listed in `missing_required_skills` is never named in `gaps`, `skill_gap_summary`, `areas_for_verification` or `overall_assessment`.
  - `recommendation_not_for_human_review`: the recommendation does not hand the decision to a person (no review, interview, verify or screen language), or it suggests rejection or an automatic decision.

## Change in this revision

The prompt moved out of `app/api/ai-analyze/route.js` into the shared module and was split into system and user messages. The local evaluator now receives the two messages, not one user message. The garbled score bands "75?100" are now "75–100". The wording is otherwise unchanged.
