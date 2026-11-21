import { isStalled } from './columns.js';

/** Built-in demo profiles (no user data). Skills use canonical catalog names. */
export const SAMPLE_CANDIDATES = [
  {
    id: 'alex',
    name: 'Alex Mercer',
    title: 'Lead Full-Stack AI Engineer',
    skills: ['Next.js', 'React', 'TypeScript', 'Supabase', 'PostgreSQL', 'pgvector', 'Gemini', 'Embeddings'],
    source: 'sample',
    yearsExperience: 8,
    profileReady: true,
  },
  {
    id: 'sarah',
    name: 'Dr. Sarah Lin',
    title: 'Staff ML & Vector Systems Engineer',
    skills: ['Python', 'Machine Learning', 'Vector Search', 'pgvector', 'HNSW', 'Gemini', 'Embeddings'],
    source: 'sample',
    yearsExperience: 10,
    profileReady: true,
  },
  {
    id: 'elena',
    name: 'Elena Rostova',
    title: 'Principal Cloud Architect',
    skills: ['AWS', 'Cloud Architecture', 'Kubernetes', 'PostgreSQL', 'Terraform', 'Row Level Security'],
    source: 'sample',
    yearsExperience: 12,
    profileReady: true,
  },
];

function displayName(fileName) {
  return String(fileName ?? '')
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Maps a resume row to the candidate shape used by matching and the UI. */
export function toCandidate(row, now = Date.now()) {
  return {
    id: `uploaded-${row.id}`,
    resumeId: row.id,
    name: row.candidate_name || displayName(row.file_name) || row.file_name,
    title: row.candidate_title || 'Uploaded candidate resume',
    skills: Array.isArray(row.extracted_skills) ? row.extracted_skills : [],
    parsedText: row.parsed_text || '',
    source: 'uploaded',
    fileName: row.file_name,
    processingStatus: row.processing_status,
    stalled: isStalled(row, now),
    createdAt: row.created_at,
    yearsExperience: row.years_experience ?? null,
    profileCompleteness: row.profile_completeness ?? 0,
    parserError: row.parser_error || '',
    profileReady: row.processing_status === 'completed',
  };
}
