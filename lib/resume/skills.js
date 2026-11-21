/**
 * Canonical skill catalog shared by the server parser and the client matcher.
 *
 * Every entry is matched as a whole token (or a whole token sequence) after
 * normalization; see `normalizeTokens` in ./text.js. Aliases are exact
 * alternative spellings, not fuzzy patterns.
 *
 * `caseSensitive` lists extra spellings that are only trusted with their
 * original capitalization because the lowercase form is a common English
 * word (e.g. "Go" vs "go", "Swift" vs "swift").
 */
export const SKILL_CATALOG = [
  // Languages
  { name: 'JavaScript', aliases: ['js', 'es6', 'ecmascript'] },
  { name: 'TypeScript', aliases: ['ts'] },
  { name: 'Python', aliases: [] },
  { name: 'Java', aliases: [] },
  { name: 'C++', aliases: ['cpp'] },
  { name: 'C#', aliases: ['csharp'] },
  { name: 'Go', aliases: ['golang'], caseSensitive: ['Go'], matchLowercase: false },
  { name: 'Rust', aliases: [] },
  { name: 'PHP', aliases: [] },
  { name: 'Ruby', aliases: [] },
  { name: 'Ruby on Rails', aliases: ['rails', 'ror'] },
  { name: 'Kotlin', aliases: [] },
  { name: 'Swift', aliases: [], caseSensitive: ['Swift'], matchLowercase: false },
  { name: 'SQL', aliases: [] },

  // Frontend
  { name: 'React', aliases: ['reactjs', 'react.js'] },
  { name: 'Next.js', aliases: ['nextjs', 'next js'] },
  { name: 'Vue', aliases: ['vue.js', 'vuejs'] },
  { name: 'Angular', aliases: ['angularjs'] },
  { name: 'Svelte', aliases: ['sveltekit'] },
  { name: 'HTML', aliases: ['html5'] },
  { name: 'CSS', aliases: ['css3'] },
  { name: 'Tailwind CSS', aliases: ['tailwind', 'tailwindcss'] },

  // Backend
  { name: 'Node.js', aliases: ['node', 'nodejs', 'node js'] },
  { name: 'Express', aliases: ['express.js', 'expressjs'], caseSensitive: ['Express'], matchLowercase: false },
  { name: 'NestJS', aliases: ['nest.js'] },
  { name: 'FastAPI', aliases: [] },
  { name: 'Django', aliases: [] },
  { name: 'Flask', aliases: [] },
  { name: 'REST API', aliases: ['rest apis', 'restful api', 'restful apis', 'restful'] },
  { name: 'GraphQL', aliases: [] },
  { name: 'WebSockets', aliases: ['websocket', 'web sockets'] },
  { name: 'Microservices', aliases: ['microservice'] },

  // Data stores
  { name: 'PostgreSQL', aliases: ['postgres', 'psql'] },
  { name: 'MySQL', aliases: [] },
  { name: 'MongoDB', aliases: ['mongo'] },
  { name: 'Redis', aliases: [] },
  { name: 'SQLite', aliases: [] },
  { name: 'Supabase', aliases: [] },
  { name: 'Firebase', aliases: [] },
  { name: 'pgvector', aliases: [] },

  // Cloud & DevOps
  { name: 'AWS', aliases: ['amazon web services'] },
  { name: 'Azure', aliases: ['microsoft azure'] },
  { name: 'GCP', aliases: ['google cloud', 'google cloud platform'] },
  { name: 'Cloud Architecture', aliases: ['cloud architect'] },
  { name: 'Docker', aliases: [] },
  { name: 'Kubernetes', aliases: ['k8s'] },
  { name: 'Terraform', aliases: [] },
  { name: 'Vercel', aliases: [] },
  { name: 'GitHub Actions', aliases: [] },
  { name: 'CI/CD', aliases: ['cicd', 'continuous integration'] },
  { name: 'Linux', aliases: [] },
  { name: 'Git', aliases: [] },

  // Data & AI
  { name: 'Machine Learning', aliases: ['ml'] },
  { name: 'Deep Learning', aliases: [] },
  { name: 'NLP', aliases: ['natural language processing'] },
  { name: 'Computer Vision', aliases: [] },
  { name: 'PyTorch', aliases: [] },
  { name: 'TensorFlow', aliases: [] },
  { name: 'scikit-learn', aliases: ['sklearn'] },
  { name: 'Pandas', aliases: [] },
  { name: 'NumPy', aliases: [] },
  { name: 'Apache Spark', aliases: ['pyspark'] },
  { name: 'Kafka', aliases: ['apache kafka'] },
  { name: 'Airflow', aliases: ['apache airflow'] },
  { name: 'LangChain', aliases: [] },
  { name: 'RAG', aliases: ['retrieval augmented generation'] },
  { name: 'LLM', aliases: ['llms', 'large language model', 'large language models'] },
  { name: 'Generative AI', aliases: ['genai', 'gen ai'] },
  { name: 'Gemini', aliases: [] },
  { name: 'OpenAI', aliases: [] },
  { name: 'Embeddings', aliases: ['embedding', 'vector embeddings'] },
  { name: 'Vector Search', aliases: ['vector database', 'vector databases', 'similarity search'] },
  { name: 'HNSW', aliases: [] },
  { name: 'Prompt Engineering', aliases: [] },
  { name: 'Fine-tuning', aliases: ['finetuning', 'fine tuning'] },

  // Security & process
  { name: 'OAuth', aliases: ['oauth2', 'oauth 2.0'] },
  { name: 'JWT', aliases: ['json web token', 'json web tokens'] },
  { name: 'Row Level Security', aliases: ['rls', 'row-level security'] },
  { name: 'Agile', aliases: [] },
  { name: 'Scrum', aliases: [] },
];
