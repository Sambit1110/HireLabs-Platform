# `/api/match` contract (frontend ↔ backend)

The dashboard's "Rank candidates for a job" section (`components/dashboard/CandidateRanking.tsx`) already calls this endpoint. Until it exists, the dashboard shows "Semantic matching isn't available yet". Implement it to this shape and the UI works with no frontend changes.

## Request

```http
POST /api/match
Authorization: Bearer <supabase access token>
Content-Type: application/json

{ "job_description": "…up to 12,000 characters…", "match_count": 10 }
```

- Authenticate with `authenticateRequest` (as the other routes do).
- Only rank the signed-in user's own resumes (the `match_resumes` RPC filters by `auth.uid()`).

## Success response

```json
{
  "success": true,
  "data": {
    "model_used": "hirelabs-matcher",
    "matches": [
      { "id": "<resume uuid>", "file_name": "jane_doe.pdf", "similarity": 0.83 },
      { "id": "<resume uuid>", "file_name": "sam_lee.pdf", "similarity": 0.71 }
    ]
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `model_used` | string | `hirelabs-matcher` for our model. Anything starting with `gemini` shows as "Gemini fallback". |
| `matches[].id` | string | The `resumes.id`. The UI looks up name, title and skills from the user's resume list. |
| `matches[].similarity` | number, 0–1 | Cosine similarity (`1 - distance`). Shown as a percentage. The UI sorts by it. |
| `matches[].file_name` | string, optional | Fallback label if the resume isn't in the loaded list. |
| `matches[].candidate_name`, `candidate_title` | string, optional | Same, as a fallback. |
| `matches[].llm_fit` | object or `null` | hirelabs-llm's second opinion for the top 20: `{ "score": 0-100, "verdict": "strong" \| "moderate" \| "weak", "missing_skills": [...] }`. `null` when the LLM was off, unavailable or failed. Never changes the order. |
| `llm_model` | string or `null` | `hirelabs-llm` when at least one match has `llm_fit`, `llm-placeholder` in placeholder mode, else `null`. |

## Errors

Use the shared `apiError(code, message, status)` envelope. The UI shows `error.message` to the user, and a `404` is treated as "endpoint not available yet".
