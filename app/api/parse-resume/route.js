import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Kotlin', 'Swift',
  'React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Node.js', 'Express', 'NestJS', 'FastAPI', 'Django', 'Flask',
  'HTML', 'CSS', 'Tailwind CSS', 'REST API', 'GraphQL', 'WebSockets',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Supabase', 'Firebase', 'pgvector',
  'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform', 'Vercel', 'GitHub Actions', 'CI/CD',
  'Machine Learning', 'Deep Learning', 'Natural Language Processing', 'NLP', 'Computer Vision', 'PyTorch', 'TensorFlow',
  'scikit-learn', 'Pandas', 'NumPy', 'LangChain', 'RAG', 'LLM', 'Large Language Models', 'Generative AI',
  'Gemini', 'OpenAI', 'Embeddings', 'Vector Search', 'HNSW', 'Prompt Engineering', 'Fine-tuning',
  'Git', 'Linux', 'OAuth', 'JWT', 'Row Level Security', 'RLS', 'Agile', 'Scrum',
];

async function parsePdf(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText();
    const text = result?.text || '';

    if (!text.trim()) {
      throw new Error(
        'No readable text could be extracted from this PDF. It may be scanned/image-only or use unsupported text encoding.'
      );
    }

    return text;
  } finally {
    await parser.destroy();
  }
}

async function parseDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result?.value || '';
}

function cleanText(value) {
  return value
    .replace(/\u0000/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
    .slice(0, 50000);
}

function extractName(text, filename) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const bad = /resume|curriculum|vitae|experience|education|skills|profile|summary|contact|email|phone|github|linkedin/i;
  const likely = lines.find((line) => {
    if (bad.test(line)) return false;
    if (line.length < 3 || line.length > 60) return false;
    if (/[@\d]/.test(line)) return false;
    const words = line.split(/\s+/);
    return words.length >= 2 && words.length <= 5 && words.every((word) => /^[A-Za-z.'-]+$/.test(word));
  });

  if (likely) return likely;

  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Uploaded Candidate';
}

function extractTitle(text) {
  const titles = [
    'software engineer', 'software developer', 'full stack engineer', 'full-stack engineer',
    'frontend engineer', 'backend engineer', 'data scientist', 'data engineer',
    'machine learning engineer', 'ml engineer', 'ai engineer', 'devops engineer',
    'cloud engineer', 'cloud architect', 'solutions architect', 'product manager',
    'project manager', 'security engineer', 'cybersecurity engineer', 'web developer',
    'android developer', 'ios developer', 'qa engineer', 'test engineer', 'research scientist',
  ];
  const lower = text.toLowerCase();
  return titles.find((title) => lower.includes(title)) || 'Uploaded candidate';
}

function extractYears(text) {
  const matches = [...text.matchAll(/(?:over|more than|around|approx(?:imately)?|with)?\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)(?:\s+of\s+experience)?/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= 0 && n <= 50);
  if (!matches.length) return null;
  return Math.max(...matches);
}

function extractSkills(text) {
  const lower = text.toLowerCase();
  const found = SKILLS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').toLowerCase();
    return new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`, 'i').test(lower);
  });
  return [...new Set(found)];
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No resume file provided.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Resume exceeds the 5 MB limit.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const extension = file.name.split('.').pop()?.toLowerCase();

    let parsedText;
    if (extension === 'pdf' || file.type === 'application/pdf') {
      parsedText = await parsePdf(buffer);
    } else if (
      extension === 'docx' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      parsedText = await parseDocx(buffer);
    } else {
      return NextResponse.json({ error: 'Only PDF and DOCX resumes are supported.' }, { status: 400 });
    }

    parsedText = cleanText(parsedText);
    if (parsedText.length < 40) {
      return NextResponse.json({ error: 'The resume contains too little readable text to build a reliable profile.' }, { status: 422 });
    }

    const skills = extractSkills(parsedText);
    const candidateName = extractName(parsedText, file.name);
    const candidateTitle = extractTitle(parsedText);
    const yearsExperience = extractYears(parsedText);

    return NextResponse.json({
      parsedText,
      candidateName,
      candidateTitle,
      yearsExperience,
      extractedSkills: skills,
      profileCompleteness: Math.min(100, Math.round(
        35 +
        Math.min(35, skills.length * 3.5) +
        (candidateName ? 10 : 0) +
        (candidateTitle !== 'Uploaded candidate' ? 10 : 0) +
        (yearsExperience !== null ? 10 : 0)
      )),
    });
  } catch (error) {
    console.error('Resume parser error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unable to parse resume.',
    }, { status: 500 });
  }
}
