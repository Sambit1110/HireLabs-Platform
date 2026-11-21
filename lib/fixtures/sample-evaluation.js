/**
 * SAMPLE DATA — a fictional candidate evaluation in the exact shape
 * /api/ai-analyze returns in candidate mode (plus the planned `fit_score`).
 *
 * Used only for the development-mode "Preview sample" button, so the
 * dashboard can be built and demoed before the team's models are ready.
 * It is never shown as a real result.
 */
export const SAMPLE_EVALUATION = {
  candidate_summary:
    'Backend engineer with 4 years building Node.js and PostgreSQL services; strong API and database work, limited cloud infrastructure experience.',
  relevant_experience_summary:
    'Led the payments API rewrite at a fintech start-up; maintained PostgreSQL schemas and CI pipelines.',
  technical_strengths: ['Node.js', 'PostgreSQL', 'REST API design'],
  relevant_projects: ['Payments API rewrite', 'Internal reporting service'],
  fit_verdict: 'moderate',
  fit_score: 68,
  confidence: 72,
  strengths: [
    'Four years of production backend experience matches the role level.',
    'Owned database schema design and migrations.',
  ],
  gaps: [
    'No evidence of Kubernetes or container orchestration.',
    'Limited exposure to event-driven systems.',
  ],
  evidence_signals: [
    '"Rewrote the payments API in Node.js, cutting p95 latency from 900 ms to 220 ms."',
    '"Designed and maintained PostgreSQL schemas for 30+ tables."',
    '"Set up GitHub Actions CI for 6 services."',
  ],
  risk_flags: ['Two job changes in 18 months; worth asking about.'],
  interview_questions: [
    'Walk us through how you measured and reduced the payments API latency.',
    'How would you approach deploying one of your services to Kubernetes?',
  ],
  recommendation: 'Advance to a technical interview focused on infrastructure depth.',
  skill_gap_analysis: {
    demonstrated_skills: ['Node.js', 'PostgreSQL', 'REST APIs', 'CI/CD'],
    partially_demonstrated_skills: ['Docker'],
    missing_required_skills: ['Kubernetes'],
    missing_preferred_skills: ['Kafka'],
    unverified_skills: ['AWS'],
    skill_gap_summary:
      'Core backend skills are well evidenced; the main gap is container orchestration.',
  },
  recruiter_insights: {
    strongest_alignment: ['Backend API ownership', 'Database design'],
    areas_for_verification: ['Depth of AWS experience (listed without examples)'],
    suggested_interview_focus: ['Infrastructure', 'System design'],
    overall_assessment:
      'A solid backend candidate who would need support on the infrastructure side.',
  },
};

/**
 * SAMPLE DATA — a fictional ranking in the shape /api/match will return.
 */
export const SAMPLE_MATCHES = [
  { id: 'sample-1', file_name: 'sample_priya_backend.pdf', candidate_name: 'Priya (sample)', candidate_title: 'Backend Engineer', similarity: 0.83 },
  { id: 'sample-2', file_name: 'sample_daniel_fullstack.pdf', candidate_name: 'Daniel (sample)', candidate_title: 'Full-Stack Developer', similarity: 0.71 },
  { id: 'sample-3', file_name: 'sample_mei_data.pdf', candidate_name: 'Mei (sample)', candidate_title: 'Data Analyst', similarity: 0.42 },
];
