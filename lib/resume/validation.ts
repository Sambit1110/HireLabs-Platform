const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function validateResume(file: File): string | null {
  const supportedByExtension = /\.(pdf|docx)$/i.test(file.name);
  if (!ALLOWED_TYPES.has(file.type) && !(!file.type && supportedByExtension)) {
    return "Only PDF and DOCX files are allowed.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "Resume must be 5 MB or smaller.";
  }

  return null;
}
