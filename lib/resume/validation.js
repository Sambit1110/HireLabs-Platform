/** Resume file rules shared by the browser (pre-upload) and the server (pre-parse). */

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const MAX_BATCH_FILES = 20;

export const RESUME_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export function fileExtension(name) {
  const match = /\.([a-z0-9]+)$/i.exec(String(name ?? ''));
  return match ? match[1].toLowerCase() : '';
}

/** Content type to store the object with, derived from the extension (browsers sometimes report ""). */
export function contentTypeFor(name) {
  return RESUME_TYPES[fileExtension(name)] ?? null;
}

/**
 * Validates name, extension, MIME type (when the browser provides one) and size.
 * @returns {string | null} a user-facing error, or null when valid
 */
export function validateResumeFile({ name, size, type }) {
  const extension = fileExtension(name);
  const expectedType = RESUME_TYPES[extension];

  if (!expectedType) {
    return 'Only PDF and DOCX resumes are supported.';
  }
  if (type && type !== expectedType && type !== 'application/octet-stream') {
    return `The file type (${type}) does not match its .${extension} extension.`;
  }
  if (!Number.isFinite(size) || size <= 0) {
    return 'The file is empty.';
  }
  if (size > MAX_RESUME_BYTES) {
    return 'Resumes must be 5 MB or smaller.';
  }
  return null;
}

export function validateResume(file) {
  return validateResumeFile(file);
}
