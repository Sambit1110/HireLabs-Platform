# Model results file format

The dashboard page **`/dashboard/results`** reads **`public/model-results.json`** and shows it as comparison tables, bar charts and a fairness table. The evaluation script (`scripts/eval/run_all.py`) should write this file. If the file is missing, the page shows "No evaluation results yet".

In development, the page has a **"Preview with sample numbers"** button that loads made-up data from `lib/fixtures/sample-model-results.js` with a SAMPLE banner. Never copy those numbers into the real file.

## Shape

```json
{
  "generated_at": "2026-12-15T10:00:00Z",
  "test_set": {
    "description": "Held-out test set: never used for training or tuning.",
    "resumes": 150,
    "pairs": 150
  },
  "tasks": [
    {
      "id": "matching",
      "title": "Candidate matching",
      "description": "Ranking resumes for a job description.",
      "metrics": [
        {
          "key": "recall_at_5",
          "label": "Recall@5",
          "higher_is_better": true,
          "unit": "ratio",
          "description": "Share of jobs where a strong-fit resume appears in the top 5."
        }
      ],
      "systems": [
        { "name": "TF-IDF baseline", "kind": "baseline", "values": { "recall_at_5": 0.46 } },
        { "name": "hirelabs-matcher", "kind": "ours", "values": { "recall_at_5": 0.79 } }
      ]
    }
  ],
  "bias_check": {
    "description": "Identical resumes where only the name, pronouns and gendered words were changed.",
    "variants": 20,
    "systems": [
      { "name": "hirelabs-evaluator", "kind": "ours", "mean_abs_delta": 2.4, "max_abs_delta": 7, "verdict_flips": 1 }
    ]
  }
}
```

## Field reference

| Field | Required | Notes |
|---|---|---|
| `generated_at` | no | ISO date-time string. |
| `test_set.resumes`, `test_set.pairs` | no | Whole numbers. |
| `tasks[]` | **yes** | At least one task with ≥ 1 metric and ≥ 1 system. |
| `tasks[].metrics[].key` | **yes** | Must match the keys in each system's `values`. |
| `tasks[].metrics[].higher_is_better` | no | Default `true`. Set `false` for error, MAE and latency. Decides which value is highlighted as best. |
| `tasks[].metrics[].unit` | no | `ratio` (0–1, shown as `0.84`), `percent` (0–100, shown as `96.3%`), `points` (shown as `4.1`) or `seconds` (shown as `1.8 s`). Default `ratio`. |
| `tasks[].systems[].kind` | no | `baseline`, `gemini` or `ours`. Controls bar colour and the "Our model" label. |
| `tasks[].systems[].values` | **yes** | Use `null` for a metric a system wasn't measured on. It shows as `—`. |
| `bias_check` | no | Omit until the fairness check has run. |
| `bias_check.systems[].mean_abs_delta`, `max_abs_delta` | no | Change in `fit_score` points between name/gender variants. |
| `bias_check.systems[].verdict_flips` | no | Whole number of variants whose verdict changed. |

The page checks the file with `lib/eval/results.js` (tested in `tests/model-results.test.js`). If the file is invalid, the page shows the reason instead of crashing.
