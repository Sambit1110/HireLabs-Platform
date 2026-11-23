export class ResumeProcessingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ResumeProcessingError';
    this.code = code;
  }
}

export function resumeProcessingFailure(error) {
  if (error?.code === '23514') {
    return {
      code: 'RESUME_STATUS_MIGRATION_REQUIRED',
      message: 'The database is missing migration 006. Run supabase/migrations/006_allow_parsed_status.sql, then retry this resume.',
    };
  }

  if (error?.code === '42703' || error?.code === 'PGRST204') {
    return {
      code: 'RESUME_COLUMNS_MIGRATION_REQUIRED',
      message: 'The database is missing resume columns from migration 005. Run supabase/migrations/005_semantic_matching.sql, then retry this resume.',
    };
  }

  if (error instanceof ResumeProcessingError) {
    return { code: error.code, message: error.message };
  }

  return {
    code: 'PARSE_FAILED',
    message: 'Resume processing failed. Check that the DOCX or PDF is valid, then retry.',
  };
}
