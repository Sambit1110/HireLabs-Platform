/**
 * SAMPLE DATA — made-up numbers in the exact format of
 * public/model-results.json (see docs/results/RESULTS_FORMAT.md).
 *
 * Only used by the development-mode "Preview sample" button on
 * /dashboard/results, which shows a clear SAMPLE banner. Never present
 * these numbers as real results.
 */
export const SAMPLE_MODEL_RESULTS = {
  sample: true,
  generated_at: '2026-12-15T10:00:00Z',
  test_set: {
    description: 'Held-out test set: never used for training or tuning.',
    resumes: 150,
    pairs: 150,
  },
  tasks: [
    {
      id: 'parsing',
      title: 'Resume parsing',
      description: 'Extracting names, job titles and skills from resume text.',
      metrics: [
        { key: 'f1_name', label: 'F1: NAME', higher_is_better: true, unit: 'ratio', description: 'Exact-span F1 for candidate names (1.00 is perfect).' },
        { key: 'f1_skill', label: 'F1: SKILL', higher_is_better: true, unit: 'ratio', description: 'Exact-span F1 for skills.' },
        { key: 'f1_title', label: 'F1: TITLE', higher_is_better: true, unit: 'ratio', description: 'Exact-span F1 for job titles.' },
      ],
      systems: [
        { name: 'Keyword baseline', kind: 'baseline', values: { f1_name: 0.61, f1_skill: 0.52, f1_title: 0.38 } },
        { name: 'Gemini', kind: 'gemini', values: { f1_name: 0.93, f1_skill: 0.78, f1_title: 0.74 } },
        { name: 'hirelabs-parser', kind: 'ours', values: { f1_name: 0.91, f1_skill: 0.84, f1_title: 0.77 } },
      ],
    },
    {
      id: 'matching',
      title: 'Candidate matching',
      description: 'Ranking resumes for a job description.',
      metrics: [
        { key: 'recall_at_5', label: 'Recall@5', higher_is_better: true, unit: 'ratio', description: 'Share of jobs where a strong-fit resume appears in the top 5.' },
        { key: 'mrr', label: 'MRR', higher_is_better: true, unit: 'ratio', description: 'How high the first strong-fit resume ranks (1.00 = always first).' },
      ],
      systems: [
        { name: 'TF-IDF baseline', kind: 'baseline', values: { recall_at_5: 0.46, mrr: 0.31 } },
        { name: 'Base embedding model', kind: 'baseline', values: { recall_at_5: 0.58, mrr: 0.42 } },
        { name: 'hirelabs-matcher', kind: 'ours', values: { recall_at_5: 0.79, mrr: 0.61 } },
      ],
    },
    {
      id: 'evaluation',
      title: 'Candidate evaluation',
      description: 'Scoring a resume against a job description.',
      metrics: [
        { key: 'verdict_accuracy', label: 'Verdict accuracy', higher_is_better: true, unit: 'percent', description: 'Share of test pairs where the verdict matches the human label.' },
        { key: 'score_mae', label: 'Score error (MAE)', higher_is_better: false, unit: 'points', description: 'Average distance from the human fit score, in points out of 100.' },
        { key: 'valid_json', label: 'Valid JSON', higher_is_better: true, unit: 'percent', description: 'Share of responses the app could use.' },
        { key: 'latency', label: 'Avg time', higher_is_better: false, unit: 'seconds', description: 'Average seconds per evaluation.' },
      ],
      systems: [
        { name: 'Skill-overlap baseline', kind: 'baseline', values: { verdict_accuracy: 48, score_mae: 21.4, valid_json: 100, latency: 0.01 } },
        { name: 'Gemini', kind: 'gemini', values: { verdict_accuracy: 76, score_mae: 10.2, valid_json: 99.3, latency: 4.8 } },
        { name: 'hirelabs-evaluator', kind: 'ours', values: { verdict_accuracy: 72, score_mae: 11.6, valid_json: 97.3, latency: 3.1 } },
      ],
    },
  ],
  bias_check: {
    description: 'Identical resumes where only the name, pronouns and gendered words were changed.',
    variants: 20,
    systems: [
      { name: 'Gemini', kind: 'gemini', mean_abs_delta: 1.9, max_abs_delta: 6, verdict_flips: 1 },
      { name: 'hirelabs-evaluator', kind: 'ours', mean_abs_delta: 2.4, max_abs_delta: 7, verdict_flips: 1 },
      { name: 'hirelabs-evaluator (names removed)', kind: 'ours', mean_abs_delta: 0.4, max_abs_delta: 2, verdict_flips: 0 },
    ],
  },
};
