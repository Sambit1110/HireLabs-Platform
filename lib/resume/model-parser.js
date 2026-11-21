import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function normalizePythonProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid resume model output.');
  }

  if (
    typeof value.candidateName !== 'string'
    && value.candidateName !== null
  ) {
    throw new Error('Invalid candidate name.');
  }

  if (
    typeof value.candidateTitle !== 'string'
    && value.candidateTitle !== null
  ) {
    throw new Error('Invalid candidate title.');
  }

  if (!Array.isArray(value.extractedSkills)) {
    throw new Error('Invalid extracted skills.');
  }

  const skills = [];
  const seen = new Set();
  for (const item of value.extractedSkills) {
    if (typeof item !== 'string') continue;
    const skill = item.replace(/\s+/g, ' ').trim().slice(0, 100);
    const key = skill.toLocaleLowerCase();
    if (skill && !seen.has(key)) {
      seen.add(key);
      skills.push(skill);
      if (skills.length >= 100) break;
    }
  }

  const experience = value.yearsExperience;
  const yearsExperience =
    typeof experience === 'number'
    && Number.isInteger(experience)
    && experience >= 0
    && experience <= 80
      ? experience
      : null;

  return {
    candidateName: typeof value.candidateName === 'string'
      ? value.candidateName.slice(0, 200)
      : null,
    candidateTitle: typeof value.candidateTitle === 'string'
      ? value.candidateTitle.slice(0, 200)
      : null,
    extractedSkills: skills,
    yearsExperience,
  };
}

export async function parseResumeWithModel(text) {
  const configuredPython =
    process.env.RESUME_PYTHON_PATH;
  const pythonExecutable =
    configuredPython
      ? path.isAbsolute(configuredPython)
        ? configuredPython
        : path.join(process.cwd(), configuredPython)
      : path.join(process.cwd(), '.venv', 'Scripts', 'python.exe');
  const scriptPath = path.join(
    process.cwd(),
    'scripts',
    'python',
    'resume_parser.py'
  );

  const { stdout, stderr } = await execFileAsync(
    pythonExecutable,
    [scriptPath],
    {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024,
      timeout: 50_000,
      windowsHide: true,
      input: JSON.stringify({ text }),
    }
  );

  if (stderr && process.env.NODE_ENV !== 'production') {
    console.warn('Resume model warnings:', stderr.slice(0, 500));
  }

  const parsed = JSON.parse(stdout.trim());
  if (parsed.error) {
    throw new Error(parsed.error);
  }
  return normalizePythonProfile(parsed);
}
