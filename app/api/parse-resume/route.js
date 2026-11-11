import mammoth from 'mammoth';
import { apiError, apiSuccess } from '@/lib/api/response';
import { authenticateRequest } from '@/lib/supabase/server-auth';
import { cleanResumeText } from '@/lib/resume/text';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function extractPdf(buffer) {
  const pkg = await import('pdf-parse');
  const PDFParse = pkg.PDFParse || pkg.default || pkg;
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try { return (await parser.getText())?.text || ''; } finally { await parser.destroy(); }
}

async function enrich(text, filename) {
  if (!process.env.GEMINI_API_KEY) return { error: 'Text extracted; AI enrichment is not configured.' };
  try {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.7-flash',
      contents: `Extract only details supported by this resume. Use null for unknown experience and empty arrays for unknown skills. Do not score the candidate. Filename: ${filename}\n\n${text.slice(0, 10000)}`,
      config: { responseMimeType: 'application/json', responseSchema: {
        type: Type.OBJECT,
        properties: { candidateName: { type: Type.STRING }, candidateTitle: { type: Type.STRING }, extractedSkills: { type: Type.ARRAY, items: { type: Type.STRING } }, yearsExperience: { type: Type.INTEGER } },
        required: ['candidateName', 'candidateTitle', 'extractedSkills'],
      } },
    });
    const value = JSON.parse(response.text || '{}');
    return { value };
  } catch (error) {
    console.error('Resume enrichment failed:', error);
    return { error: 'Text extracted; AI enrichment could not be completed.' };
  }
}

export async function POST(request) {
  const auth = await authenticateRequest(request);
  if (auth.response) return auth.response;
  let resumeId;
  try {
    const body = await request.json();
    resumeId = body?.resumeId;
    if (typeof resumeId !== 'string' || !/^[0-9a-f-]{36}$/i.test(resumeId)) return apiError('INVALID_REQUEST', 'A valid resumeId is required.', 400);

    const { data: resume, error: lookupError } = await auth.supabase.from('resumes')
      .select('id, user_id, file_name, file_path, file_type, processing_status')
      .eq('id', resumeId).eq('user_id', auth.user.id).maybeSingle();
    if (lookupError) throw lookupError;
    if (!resume) return apiError('RESUME_NOT_FOUND', 'Resume was not found.', 404);
    const isPdf = resume.file_name.toLowerCase().endsWith('.pdf') && (!resume.file_type || resume.file_type === 'application/pdf');
    const isDocx = resume.file_name.toLowerCase().endsWith('.docx') && (!resume.file_type || resume.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    if (!isPdf && !isDocx) return apiError('UNSUPPORTED_FILE', 'Only PDF and DOCX resumes can be processed.', 400);

    const { error: stateError } = await auth.supabase.from('resumes').update({ processing_status: 'processing', parser_error: null }).eq('id', resume.id).eq('user_id', auth.user.id);
    if (stateError) throw stateError;

    try {
      const { data: file, error: downloadError } = await auth.supabase.storage.from('resumes').download(resume.file_path);
      if (downloadError || !file) throw new Error('The stored resume could not be downloaded.');
      if (file.size > 5 * 1024 * 1024) throw new Error('Resume exceeds the 5 MB limit.');
      const buffer = await file.arrayBuffer();
      let text;
      if (isPdf) text = await extractPdf(buffer);
      else text = (await mammoth.extractRawText({ buffer: Buffer.from(buffer) })).value;
      text = cleanResumeText(text);
      if (!text) throw new Error('No readable text was found in the resume.');

      const { value, error: enrichmentError } = await enrich(text, resume.file_name);
      const parsed = value || {};
      const skills = Array.isArray(parsed.extractedSkills) ? parsed.extractedSkills.filter((item) => typeof item === 'string') : [];
      const profileCompleteness = [parsed.candidateName, parsed.candidateTitle, skills.length, Number.isInteger(parsed.yearsExperience)].filter(Boolean).length * 25;
      const fields = {
        parsed_text: text, extracted_skills: skills,
        candidate_name: parsed.candidateName && parsed.candidateName.toLowerCase() !== 'unknown' ? parsed.candidateName : null,
        candidate_title: parsed.candidateTitle || null,
        years_experience: Number.isInteger(parsed.yearsExperience) ? parsed.yearsExperience : null,
        profile_completeness: profileCompleteness, parser_error: enrichmentError || null, processing_status: 'parsed',
      };
      const { data: saved, error: saveError } = await auth.supabase.from('resumes').update(fields).eq('id', resume.id).eq('user_id', auth.user.id).select('id, processing_status, candidate_name, candidate_title, years_experience, extracted_skills, profile_completeness, parser_error').single();
      if (saveError) throw saveError;
      return apiSuccess(saved);
    } catch (error) {
      await auth.supabase.from('resumes').update({ processing_status: 'failed', parser_error: 'Resume processing failed. Please retry.' }).eq('id', resume.id).eq('user_id', auth.user.id);
      throw error;
    }
  } catch (error) {
    console.error('Resume parsing failed:', error);
    return apiError('PARSE_FAILED', error instanceof Error && error.message.includes('No readable') ? error.message : 'Unable to process this resume. Please retry.', 500);
  }
}
