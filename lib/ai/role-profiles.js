/**
 * Typical skills for common roles, used only when a job description names too few skills
 * to compare against (e.g. just "software engineer"). The explainer says when it falls back
 * to one of these, so a recruiter knows the skills were assumed, not taken from the job.
 *
 * Each entry: [phrases that identify the role, required skills, preferred skills]. Skill
 * names must match skill-lexicon.js. The longest matching phrase wins.
 */
export const ROLE_PROFILES = [
  [['software engineer', 'software developer', 'sde', 'programmer', 'software engineering'],
    ['Python', 'JavaScript', 'Git', 'SQL', 'REST APIs', 'Unit testing'], ['Java', 'Docker', 'AWS', 'CI/CD']],
  [['backend engineer', 'backend developer', 'back-end engineer', 'back-end developer', 'api developer'],
    ['REST APIs', 'SQL', 'PostgreSQL', 'Docker', 'Git', 'Unit testing'], ['Python', 'Node.js', 'Java', 'Kubernetes', 'AWS', 'Redis']],
  [['frontend engineer', 'frontend developer', 'front-end engineer', 'front-end developer', 'ui developer', 'web developer'],
    ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS', 'Git'], ['Next.js', 'Unit testing', 'Figma']],
  [['full stack engineer', 'full-stack engineer', 'full stack developer', 'full-stack developer', 'fullstack'],
    ['JavaScript', 'TypeScript', 'React', 'Node.js', 'REST APIs', 'SQL', 'Git'], ['Next.js', 'Docker', 'AWS', 'PostgreSQL']],
  [['devops engineer', 'site reliability', 'sre', 'cloud engineer', 'platform engineer'],
    ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux', 'Git'], ['Bash', 'Python', 'GCP', 'Azure']],
  [['mobile developer', 'ios developer', 'android developer', 'mobile engineer'],
    ['Swift', 'Kotlin', 'Git', 'REST APIs'], ['Unit testing', 'CI/CD', 'Figma']],
  [['ai engineer', 'llm engineer', 'generative ai', 'genai', 'applied ai'],
    ['Python', 'Large language models', 'Retrieval-augmented generation', 'Vector search', 'REST APIs'], ['PyTorch', 'Embeddings', 'Docker', 'NLP']],
  [['machine learning engineer', 'ml engineer', 'data scientist', 'machine learning'],
    ['Python', 'Machine learning', 'Statistics', 'SQL', 'Pandas'], ['PyTorch', 'TensorFlow', 'Deep learning', 'NLP', 'Docker']],
  [['data engineer', 'analytics engineer'],
    ['SQL', 'Python', 'ETL', 'Airflow', 'Spark'], ['dbt', 'Snowflake', 'AWS', 'Docker']],
  [['data analyst', 'bi analyst', 'business intelligence', 'reporting analyst', 'analytics'],
    ['SQL', 'Excel', 'Python', 'Data visualization', 'Statistics'], ['Tableau', 'Power BI', 'Pandas', 'A/B testing', 'ETL']],
  [['business analyst'],
    ['SQL', 'Excel', 'Data visualization', 'Stakeholder management', 'Communication'], ['Tableau', 'Agile', 'Jira']],
  [['product manager', 'technical product manager', 'associate product manager', 'product owner'],
    ['Product management', 'User research', 'Agile', 'Stakeholder management', 'Communication'], ['Jira', 'SQL', 'Figma', 'A/B testing']],
  [['project manager', 'program manager', 'program coordinator', 'project coordinator', 'scrum master'],
    ['Project planning', 'Risk management', 'Stakeholder management', 'Agile', 'Communication'], ['Jira', 'Excel']],
  [['ui designer', 'ux designer', 'product designer', 'ui/ux'],
    ['Figma', 'User research', 'Communication'], ['HTML', 'CSS', 'Agile']],
  [['performance marketer', 'growth marketer', 'paid marketing', 'digital marketing'],
    ['Performance marketing', 'SEM', 'Google Analytics', 'A/B testing', 'Excel'], ['SEO', 'Email marketing']],
  [['marketing manager', 'content marketer', 'content writer', 'marketing executive', 'marketing'],
    ['Content marketing', 'SEO', 'Social media', 'Google Analytics', 'Communication'], ['Email marketing', 'SEM']],
  [['account executive', 'sales representative', 'sales executive', 'business development', 'sales'],
    ['CRM', 'Prospecting', 'Negotiation', 'Closing', 'Pipeline management', 'Communication'], ['Excel']],
  [['customer success'],
    ['Customer success', 'CRM', 'Communication', 'Stakeholder management'], ['Customer support', 'Excel']],
  [['customer support', 'technical support', 'support specialist', 'help desk'],
    ['Customer support', 'Communication', 'CRM'], ['Jira', 'SQL', 'Linux']],
  [['financial analyst', 'fp&a', 'finance analyst'],
    ['Excel', 'Financial modeling', 'Forecasting', 'Budgeting', 'Variance analysis'], ['SQL', 'Power BI', 'Financial reporting']],
  [['accountant', 'accounting', 'bookkeeper', 'auditor'],
    ['Accounting', 'Excel', 'Financial reporting', 'QuickBooks'], ['Budgeting', 'Variance analysis']],
  [['operations manager', 'operations'],
    ['Project planning', 'Stakeholder management', 'Excel', 'Leadership', 'Communication'], ['Data visualization', 'Agile']],
];

/** The role profile that best fits the text: { role, required, preferred } or null. */
export function roleProfileFor(text) {
  const lower = ` ${String(text || '').toLowerCase().replace(/[^a-z0-9&/+ -]+/g, ' ')} `;
  let best = null;
  for (const [phrases, required, preferred] of ROLE_PROFILES) {
    for (const phrase of phrases) {
      if (lower.includes(` ${phrase} `) || lower.includes(` ${phrase}s `)) {
        if (!best || phrase.length > best.phrase.length) best = { phrase, role: phrases[0], required, preferred };
      }
    }
  }
  return best && { role: best.role, required: best.required, preferred: best.preferred };
}
