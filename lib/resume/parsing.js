// Server-side only: imported by app/api/parse-resume. Not imported by client code.
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

import { MAX_RESUME_BYTES, RESUME_TYPES, fileExtension } from './validation.js';
import { MIN_TEXT_LENGTH, buildProfile } from './profile.js';

/** Error whose message is safe to show to the user and store on the resume row. */
export class ResumeParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ResumeParseError';
  }
}

/** Identifies the real file format from its leading bytes rather than trusting the name. */
export function detectFileKind(bytes) {
  const head = bytes.subarray(0, 5);
  if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2d) {
    return 'pdf'; // %PDF-
  }
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) {
    return 'docx'; // ZIP container; mammoth rejects non-Word archives
  }
  return null;
}

async function pdfText(bytes) {
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return result?.text || '';
  } finally {
    await parser.destroy();
  }
}

async function docxText(bytes) {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return result?.value || '';
}

/**
 * Validates and parses a resume file into a structured profile.
 * @param {Uint8Array} bytes
 * @param {{ fileName: string, contentType?: string }} meta
 */
export async function parseResumeBytes(bytes, { fileName, contentType } = {}) {
  if (!bytes?.length) {
    throw new ResumeParseError('The resume file is empty.');
  }
  if (bytes.length > MAX_RESUME_BYTES) {
    throw new ResumeParseError('Resumes must be 5 MB or smaller.');
  }

  const extension = fileExtension(fileName);
  if (!RESUME_TYPES[extension]) {
    throw new ResumeParseError('Only PDF and DOCX resumes are supported.');
  }
  if (contentType && contentType !== RESUME_TYPES[extension] && contentType !== 'application/octet-stream') {
    throw new ResumeParseError(`The stored file type (${contentType}) does not match its .${extension} extension.`);
  }

  const kind = detectFileKind(bytes);
  if (kind !== extension) {
    throw new ResumeParseError(`This file is not a valid ${extension.toUpperCase()} document.`);
  }

  let rawText;
  try {
    // Copy so pdf.js can transfer/detach the buffer without affecting the caller.
    rawText = kind === 'pdf' ? await pdfText(new Uint8Array(bytes)) : await docxText(bytes);
  } catch (error) {
    console.error('Resume text extraction failed:', error);
    throw new ResumeParseError(
      `The ${kind.toUpperCase()} could not be read. It may be corrupted, password-protected, or in an unsupported format.`
    );
  }

  const profile = buildProfile(rawText, fileName);
  if (profile.parsedText.length < MIN_TEXT_LENGTH) {
    throw new ResumeParseError(
      kind === 'pdf'
        ? 'No readable text was found. The PDF may be scanned or image-only.'
        : 'The resume contains too little readable text to build a profile.'
    );
  }

  return profile;
}
