
import mammoth from 'mammoth';

import { apiError, apiSuccess } from '@/lib/api/response';
import { authenticateRequest } from '@/lib/supabase/server-auth';
import { cleanResumeText } from '@/lib/resume/text';
import { normalizePythonProfile } from '@/lib/resume/model-parser';
import { callModelServer, useLocalModels } from '@/lib/ai/model-server';
import { checkAIRateLimit } from '@/lib/api/ai-rate-limit';
import { embedText } from '@/lib/resume/embedding';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_RESUME_TEXT = 50000;

const PDF_MIME = 'application/pdf';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function calculateCompleteness(profile) {
  const fields = [
    Boolean(profile.candidateName),
    Boolean(profile.candidateTitle),
    profile.extractedSkills.length > 0,
    profile.yearsExperience !== null,
  ];

  return fields.filter(Boolean).length * 25;
}

function validateFileType(resume) {
  const name =
    typeof resume.file_name === 'string'
      ? resume.file_name.toLowerCase()
      : '';

  const type = resume.file_type;

  if (
    name.endsWith('.pdf') &&
    (!type || type === PDF_MIME)
  ) {
    return 'pdf';
  }

  if (
    name.endsWith('.docx') &&
    (!type || type === DOCX_MIME)
  ) {
    return 'docx';
  }

  return null;
}

function validateFileSignature(buffer, fileType) {
  const bytes = new Uint8Array(buffer);

  if (fileType === 'pdf') {
    // PDF files begin with the %PDF- signature.
    return (
      bytes.length >= 5 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d
    );
  }

  if (fileType === 'docx') {
    // DOCX is a ZIP-based document format.
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      (
        (bytes[2] === 0x03 && bytes[3] === 0x04) ||
        (bytes[2] === 0x05 && bytes[3] === 0x06) ||
        (bytes[2] === 0x07 && bytes[3] === 0x08)
      )
    );
  }

  return false;
}

async function extractPdf(buffer) {
  const pkg = await import('pdf-parse');

  const PDFParse =
    pkg.PDFParse || pkg.default?.PDFParse || pkg.default;

  if (typeof PDFParse !== 'function') {
    throw new Error('PDF parser is unavailable.');
  }

  const parser = new PDFParse({
    data: new Uint8Array(buffer),
  });

  try {
    const result = await parser.getText();

    return typeof result?.text === 'string'
      ? result.text
      : '';
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer) {
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(buffer),
  });

  return result?.value || '';
}

async function extractResumeText(buffer, fileType) {
  const rawText =
    fileType === 'pdf'
      ? await extractPdf(buffer)
      : await extractDocx(buffer);

  const cleanedText = cleanResumeText(
    rawText,
    MAX_RESUME_TEXT
  );

  if (!cleanedText) {
    throw new Error(
      'No readable text was found in the resume.'
    );
  }

  return cleanedText;
}

/** Structured profile from the team's own parser (hirelabs-parser) on the model server. */
async function enrichResume(text) {
  if (!useLocalModels()) {
    return { value: null, error: 'Text extracted; the HireLabs parser is turned off.' };
  }
  try {
    const { value, placeholder } = await callModelServer('/parse', { text });
    const modelProfile = normalizePythonProfile(value);
    if (
      modelProfile.candidateName ||
      modelProfile.candidateTitle ||
      modelProfile.extractedSkills.length > 0 ||
      modelProfile.yearsExperience !== null
    ) {
      return {
        value: modelProfile,
        modelUsed: placeholder ? 'parser-placeholder' : 'hirelabs-parser',
        error: null,
      };
    }
    return { value: null, modelUsed: 'hirelabs-parser', error: 'Text extracted; the HireLabs parser found no profile fields.' };
  } catch (error) {
    // Do not log resume content or model output.
    console.error('Resume parsing model failed:', { name: error instanceof Error ? error.name : 'UnknownError' });
    return { value: null, error: 'Text extracted; the HireLabs parser is unavailable.' };
  }
}

async function updateResume(
  supabase,
  resumeId,
  userId,
  fields
) {
  return supabase
    .from('resumes')
    .update(fields)
    .eq('id', resumeId)
    .eq('user_id', userId);
}

export async function POST(request) {
  const auth = await authenticateRequest(request);

  if (auth.response) {
    return auth.response;
  }

  const limited = checkAIRateLimit(auth.user.id);
  if (limited) return limited;

  let resume = null;

  try {
    let body;

    try {
      const rawBody = await request.text();

      if (rawBody.length > 10000) {
        return apiError(
          'INVALID_REQUEST',
          'Request body is too large.',
          413
        );
      }

      body = JSON.parse(rawBody);
    } catch {
      return apiError(
        'INVALID_JSON',
        'Invalid JSON request body.',
        400
      );
    }

    const resumeId = body?.resumeId;

    if (
      typeof resumeId !== 'string' ||
      !UUID_REGEX.test(resumeId)
    ) {
      return apiError(
        'INVALID_REQUEST',
        'A valid resumeId is required.',
        400
      );
    }

    const {
      data: resumeRecord,
      error: lookupError,
    } = await auth.supabase
      .from('resumes')
      .select(
        'id,user_id,file_name,file_path,file_type,processing_status'
      )
      .eq('id', resumeId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (!resumeRecord) {
      return apiError(
        'RESUME_NOT_FOUND',
        'Resume was not found.',
        404
      );
    }

    resume = resumeRecord;

    const fileType = validateFileType(resume);

    if (!fileType) {
      return apiError(
        'UNSUPPORTED_FILE',
        'Only PDF and DOCX resumes are supported.',
        400
      );
    }

    if (!resume.file_path) {
      return apiError(
        'INVALID_FILE',
        'Resume storage path is missing.',
        400
      );
    }

    // Set processing state before extraction.
    const { error: stateError } = await updateResume(
      auth.supabase,
      resume.id,
      auth.user.id,
      {
        processing_status: 'processing',
        parser_error: null,
      }
    );

    if (stateError) {
      throw stateError;
    }

    const {
      data: file,
      error: downloadError,
    } = await auth.supabase.storage
      .from('resumes')
      .download(resume.file_path);

    if (downloadError || !file) {
      throw new Error(
        'The stored resume could not be downloaded.'
      );
    }

    if (
      file.size === 0 ||
      file.size > MAX_FILE_SIZE
    ) {
      throw new Error('Invalid resume file size.');
    }

    const buffer = await file.arrayBuffer();

    if (!validateFileSignature(buffer, fileType)) {
      throw new Error(
        'Resume file content does not match its type.'
      );
    }

    const text = await extractResumeText(
      buffer,
      fileType
    );

    const enrichment = await enrichResume(text);

    const profile = enrichment.value || {
      candidateName: null,
      candidateTitle: null,
      extractedSkills: [],
      yearsExperience: null,
    };

    const profileCompleteness =
      calculateCompleteness(profile);

    // Generate 384-d dense embedding vector for semantic matching
    let embedding = null;
    let embeddedAt = null;
    try {
      const embedResult = await embedText(text);
      if (Array.isArray(embedResult.vector) && embedResult.vector.length === 384) {
        embedding = embedResult.vector;
        embeddedAt = new Date().toISOString();
      }
    } catch (embedError) {
      console.warn('Embedding generation on parse failed (will be retried/backfilled):', embedError?.message);
    }

    const fields = {
      parsed_text: text,
      extracted_skills: profile.extractedSkills,
      candidate_name: profile.candidateName,
      candidate_title: profile.candidateTitle,
      years_experience: profile.yearsExperience,
      profile_completeness: profileCompleteness,
      parser_error: enrichment.error || null,
      processing_status: 'parsed',
      embedding,
      embedded_at: embeddedAt,
    };

    const {
      data: saved,
      error: saveError,
    } = await updateResume(
      auth.supabase,
      resume.id,
      auth.user.id,
      fields
    ).select(
      'id,processing_status,candidate_name,candidate_title,years_experience,extracted_skills,profile_completeness,parser_error,embedded_at'
    ).single();

    if (saveError) {
      throw saveError;
    }
    return apiSuccess({ ...saved, model_used: enrichment.modelUsed || null });
  } catch (error) {
    console.error('Resume processing failed:', {
      name:
        error instanceof Error
          ? error.name
          : 'UnknownError',
    });

    if (resume?.id) {
      try {
        const { error: updateError } = await updateResume(
          auth.supabase,
          resume.id,
          auth.user.id,
          {
            processing_status: 'failed',
            parser_error:
              'Resume processing failed. Please retry.',
          }
        );

        if (updateError) {
          console.error(
            'Could not update resume failure status.'
          );
        }
      } catch {
        console.error(
          'Could not update resume failure status.'
        );
      }
    }

    return apiError(
      'PARSE_FAILED',
      'Unable to process this resume. Please retry.',
      500
    );
  }
}
