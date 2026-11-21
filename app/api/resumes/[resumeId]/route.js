import { apiError, apiSuccess } from '@/lib/api/response';
import { authenticateRequest } from '@/lib/supabase/server-auth';

export async function DELETE(request, { params }) {
  const auth = await authenticateRequest(request);
  if (auth.response) return auth.response;
  const { resumeId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(resumeId || '')) return apiError('INVALID_REQUEST', 'A valid resume ID is required.', 400);

  const { data: resume, error: lookupError } = await auth.supabase.from('resumes')
    .select('id, file_path').eq('id', resumeId).eq('user_id', auth.user.id).maybeSingle();
  if (lookupError) return apiError('DATABASE_ERROR', 'Unable to retrieve the resume.', 500);
  if (!resume) return apiError('RESUME_NOT_FOUND', 'Resume was not found.', 404);

  const { error: storageError } = await auth.supabase.storage.from('resumes').remove([resume.file_path]);
  if (storageError) return apiError('STORAGE_DELETE_FAILED', 'The resume file could not be removed; the record was kept.', 500);

  const { error: deleteError } = await auth.supabase.from('resumes').delete().eq('id', resume.id).eq('user_id', auth.user.id);
  if (deleteError) return apiError('DATABASE_DELETE_FAILED', 'The file was removed, but its database record could not be deleted. Contact support to reconcile it.', 500);
  return apiSuccess({ id: resume.id, deleted: true });
}
