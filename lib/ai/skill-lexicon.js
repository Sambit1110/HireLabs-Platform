/**
 * Skills the HireLabs explainer recognises in job descriptions and resumes.
 *
 * Each entry: [canonical name, aliases that count as the same skill, related terms that
 * count as partial evidence]. Matching ignores case and needs whole-word boundaries, so
 * "Java" never matches "JavaScript" and "SQL" never matches "PostgreSQL" (that one is a
 * related term instead). Ambiguous one- or two-letter names (Go, R, C) are left out.
 */
export const SKILLS = [
  // Programming languages
  ['Python', ['python'], []],
  ['Java', ['java'], ['kotlin', 'spring boot']],
  ['JavaScript', ['javascript', 'js', 'ecmascript'], ['typescript', 'node.js', 'react']],
  ['TypeScript', ['typescript'], ['javascript']],
  ['Golang', ['golang'], []],
  ['C++', ['c++'], []],
  ['C#', ['c#', '.net'], []],
  ['Rust', ['rust'], []],
  ['Scala', ['scala'], ['spark']],
  ['Kotlin', ['kotlin'], ['java']],
  ['Swift', ['swift', 'swiftui'], ['ios']],
  ['PHP', ['php', 'laravel'], []],
  ['Ruby', ['ruby', 'rails', 'ruby on rails'], []],
  ['Bash', ['bash', 'shell scripting'], ['linux']],
  // Web and backend
  ['HTML', ['html', 'html5'], ['css']],
  ['CSS', ['css', 'css3', 'tailwind', 'sass'], ['html']],
  ['React', ['react', 'react.js', 'reactjs', 'react hooks'], ['next.js', 'frontend']],
  ['Next.js', ['next.js', 'nextjs'], ['react']],
  ['Vue', ['vue', 'vue.js', 'nuxt'], []],
  ['Angular', ['angular'], []],
  ['Node.js', ['node.js', 'nodejs', 'express.js'], ['javascript']],
  ['FastAPI', ['fastapi'], ['flask', 'django', 'python']],
  ['Django', ['django'], ['flask', 'fastapi']],
  ['Flask', ['flask'], ['fastapi', 'django']],
  ['Spring Boot', ['spring boot'], ['java']],
  ['REST APIs', ['rest api', 'rest apis', 'restful', 'backend apis', 'api endpoints', 'endpoints'], ['graphql', 'fastapi', 'express']],
  ['GraphQL', ['graphql'], ['rest api']],
  ['Microservices', ['microservices', 'microservice'], ['docker', 'kubernetes']],
  ['Frontend development', ['frontend', 'front-end', 'frontend interfaces', 'user interfaces', 'ui development'], ['react', 'next.js', 'vue', 'angular', 'css']],
  ['Full-stack development', ['full-stack', 'full stack', 'fullstack'], ['frontend', 'backend', 'react', 'node.js']],
  // Data stores
  ['SQL', ['sql'], ['postgresql', 'mysql', 'sqlite', 'snowflake', 'bigquery']],
  ['PostgreSQL', ['postgresql', 'postgres'], ['sql', 'mysql']],
  ['MySQL', ['mysql'], ['sql', 'postgresql']],
  ['MongoDB', ['mongodb', 'mongo'], ['nosql']],
  ['Redis', ['redis'], []],
  ['Supabase', ['supabase'], ['postgresql']],
  // Cloud and DevOps
  ['Docker', ['docker', 'containers', 'containerization'], ['kubernetes']],
  ['Kubernetes', ['kubernetes', 'k8s'], ['docker']],
  ['AWS', ['aws', 'amazon web services', 'ec2', 's3', 'aws lambda'], ['gcp', 'azure', 'cloud']],
  ['GCP', ['gcp', 'google cloud'], ['aws', 'azure', 'cloud']],
  ['Azure', ['azure'], ['aws', 'gcp', 'cloud']],
  ['CI/CD', ['ci/cd', 'continuous integration', 'github actions', 'jenkins'], ['docker']],
  ['Git', ['git', 'github', 'gitlab', 'version control'], []],
  ['Linux', ['linux', 'unix'], ['bash']],
  ['Unit testing', ['unit testing', 'unit tests', 'pytest', 'jest', 'vitest', 'test-driven'], ['testing']],
  // AI and data science
  ['Machine learning', ['machine learning', 'ml models', 'scikit-learn', 'sklearn'], ['deep learning', 'pytorch', 'tensorflow', 'logistic regression']],
  ['Deep learning', ['deep learning', 'neural networks'], ['pytorch', 'tensorflow', 'machine learning']],
  ['PyTorch', ['pytorch'], ['tensorflow', 'deep learning']],
  ['TensorFlow', ['tensorflow', 'keras'], ['pytorch', 'deep learning']],
  ['NLP', ['nlp', 'natural language processing', 'spacy'], ['llm', 'transformers']],
  ['Large language models', ['llm', 'llms', 'large language model', 'large language models', 'llm integration', 'gpt'], ['nlp', 'rag', 'language model', 'transformers']],
  ['Retrieval-augmented generation', ['rag', 'retrieval-augmented generation', 'retrieval augmented generation'], ['vector search', 'embeddings', 'llm']],
  ['Vector search', ['vector search', 'vector database', 'pgvector', 'faiss', 'pinecone', 'semantic search'], ['embeddings', 'rag']],
  ['Embeddings', ['embeddings', 'sentence embeddings', 'vector embeddings'], ['vector search']],
  ['Pandas', ['pandas'], ['numpy', 'python']],
  ['NumPy', ['numpy'], ['pandas']],
  ['Statistics', ['statistics', 'statistical analysis', 'hypothesis testing', 'regression'], ['a/b testing']],
  ['A/B testing', ['a/b testing', 'a/b tests', 'ab testing', 'experimentation'], ['statistics']],
  ['Data visualization', ['data visualization', 'dashboards', 'dashboard'], ['tableau', 'power bi', 'looker']],
  ['Tableau', ['tableau'], ['power bi', 'looker', 'data visualization']],
  ['Power BI', ['power bi', 'powerbi'], ['tableau', 'data visualization']],
  ['Excel', ['excel', 'spreadsheets', 'vlookup', 'pivot tables'], ['google sheets']],
  ['ETL', ['etl', 'data pipelines', 'data pipeline', 'elt'], ['airflow', 'dbt']],
  ['dbt', ['dbt'], ['etl', 'sql']],
  ['Airflow', ['airflow'], ['etl']],
  ['Spark', ['spark', 'pyspark'], ['hadoop', 'scala']],
  ['Snowflake', ['snowflake', 'bigquery', 'redshift'], ['sql']],
  // Product and project
  ['Product management', ['product management', 'product roadmap', 'roadmapping', 'roadmap'], ['user research', 'stakeholder management']],
  ['User research', ['user research', 'user interviews', 'usability testing'], ['product management']],
  ['Figma', ['figma'], ['ui design', 'wireframes']],
  ['Agile', ['agile', 'scrum', 'kanban', 'sprint'], ['jira']],
  ['Jira', ['jira', 'asana', 'trello'], ['agile']],
  ['Project planning', ['project planning', 'project management', 'timeline management'], ['risk management']],
  ['Risk management', ['risk management'], ['project planning']],
  ['Stakeholder management', ['stakeholder management', 'stakeholder communication'], ['stakeholders', 'communication']],
  // Sales and customer
  ['CRM', ['crm', 'salesforce', 'hubspot'], []],
  ['Negotiation', ['negotiation', 'negotiating'], ['closing']],
  ['Prospecting', ['prospecting', 'lead generation', 'outbound'], ['pipeline management']],
  ['Pipeline management', ['pipeline management', 'sales pipeline'], ['prospecting', 'crm']],
  ['Closing', ['closing deals', 'closed deals', 'closing'], ['closed', 'negotiation']],
  ['Customer success', ['customer success', 'account management', 'customer retention', 'onboarding'], ['customer support']],
  ['Customer support', ['customer support', 'technical support', 'help desk', 'zendesk', 'troubleshooting'], ['customer success']],
  // Marketing
  ['SEO', ['seo', 'search engine optimization'], ['content marketing', 'google analytics']],
  ['SEM', ['sem', 'google ads', 'paid search', 'ppc'], ['performance marketing']],
  ['Performance marketing', ['performance marketing', 'paid social', 'paid acquisition'], ['sem', 'google analytics']],
  ['Content marketing', ['content marketing', 'copywriting', 'content strategy', 'blog'], ['seo', 'social media']],
  ['Social media', ['social media'], ['content marketing']],
  ['Email marketing', ['email marketing', 'mailchimp', 'email campaigns'], ['content marketing']],
  ['Google Analytics', ['google analytics', 'ga4'], ['seo', 'performance marketing']],
  // Finance
  ['Accounting', ['accounting', 'bookkeeping', 'reconciliation', 'reconciliations', 'gaap', 'ifrs'], ['financial reporting']],
  ['Financial modeling', ['financial modeling', 'financial modelling', 'valuation'], ['forecasting', 'excel']],
  ['Forecasting', ['forecasting', 'forecasts'], ['budgeting', 'financial modeling']],
  ['Budgeting', ['budgeting', 'budgets'], ['forecasting']],
  ['Variance analysis', ['variance analysis'], ['forecasting', 'budgeting']],
  ['Financial reporting', ['financial reporting', 'financial statements'], ['accounting']],
  ['QuickBooks', ['quickbooks', 'tally', 'sap'], ['accounting']],
  // Broad skills
  ['Communication', ['communication', 'presentations', 'presenting'], ['stakeholder management']],
  ['Leadership', ['leadership', 'led a team', 'mentored', 'team lead'], []],
];

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** Case-insensitive whole-term matcher: no letter, digit, +, # or a joined dot on either side ("js" never matches "Node.js"). */
export function termPattern(term) {
  return new RegExp(`(?<![A-Za-z0-9+#]|[A-Za-z0-9]\\.)${escape(term)}(?![A-Za-z0-9+#]|\\.[A-Za-z])`, 'i');
}

export const SKILL_INDEX = SKILLS.map(([name, aliases, related]) => {
  const terms = [name.toLowerCase(), ...aliases].filter((term, i, all) => all.indexOf(term) === i);
  return { name, terms, aliases: terms.map(termPattern), related: related.map(termPattern) };
});
