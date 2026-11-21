# HireLabs dataset card

Version and freeze date: [PLACEHOLDER]. Maintainer: Pushpita.

| Source | URL and version | License and allowed uses | Consent basis and permission for hosted processing |
|---|---|---|---|
| Resume corpus | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |
| Job descriptions | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |

Languages, occupations, geography, collection dates and exclusions: [PLACEHOLDER].
Record duplicate-removal decisions, alternate versions removed before ingestion, truncation and counts excluded: [PLACEHOLDER].

## Composition

Use stats.py after adjudication. Mayukh supplies restricted aggregates. Leave missing files and unavailable measurements marked pending. Job descriptions form one shared pool of [PLACEHOLDER]; the jobs column counts distinct jobs in reviewed pairs for that split.

| Split | Resumes | Jobs | Labelled resumes | Pairs | human | gemini_checked | category |
|---|---|---|---|---|---|---|---|
| Train | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |
| Dev | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |
| Test | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |

| Split | NAME | TITLE | SKILL | YEARS_EXPERIENCE | DEGREE | COMPANY |
|---|---|---|---|---|---|---|
| Train | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |
| Dev | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |
| Test | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |

| Split | strong | moderate | weak | insufficient_evidence |
|---|---|---|---|---|
| Train | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |
| Dev | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |
| Test | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |

## Methods and limitations

The application cleaner normalizes text before exact deduplication. The frozen manifest assigns each resume to one split. Job text is shared, so the evaluation measures generalization to unseen resumes. Exact matching can miss near-duplicates. Keyword overlap approximates occupational similarity and can underrepresent transferable skills.

Report Gemini's model/version, approved inputs, reviewer instructions and overrides: [PLACEHOLDER]. Gemini proposals checked by humans are knowledge distillation; human-only labels retain separate provenance. Document inter-annotator agreement, coverage gaps and observed biases: [PLACEHOLDER]. Keep the raw data and identifiable review trail private.
