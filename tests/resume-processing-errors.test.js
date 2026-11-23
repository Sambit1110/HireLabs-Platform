import { describe, expect, it } from 'vitest';

import { ResumeProcessingError, resumeProcessingFailure } from '../lib/resume/processing-errors.js';

describe('resume processing errors', () => {
  it('explains when the parsed status migration is missing', () => {
    const failure = resumeProcessingFailure({ code: '23514' });
    expect(failure.code).toBe('RESUME_STATUS_MIGRATION_REQUIRED');
    expect(failure.message).toContain('006_allow_parsed_status.sql');
  });

  it('explains when resume columns from migration 005 are missing', () => {
    const failure = resumeProcessingFailure({ code: '42703' });
    expect(failure.code).toBe('RESUME_COLUMNS_MIGRATION_REQUIRED');
    expect(failure.message).toContain('005_semantic_matching.sql');
  });

  it('reports readable document errors without leaking raw parser output', () => {
    const failure = resumeProcessingFailure(new ResumeProcessingError(
      'RESUME_DOCUMENT_INVALID',
      'The DOCX could not be read. Re-save it as a valid DOCX file and upload it again.'
    ));
    expect(failure.code).toBe('RESUME_DOCUMENT_INVALID');
    expect(failure.message).toContain('Re-save it');
  });

  it('does not expose unknown database or parser error details', () => {
    const failure = resumeProcessingFailure({ code: 'XX000', message: 'private resume content' });
    expect(failure.message).not.toContain('private resume content');
    expect(failure.message).toContain('Check that the DOCX or PDF is valid');
  });
});
