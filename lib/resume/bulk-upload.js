import { runWithConcurrency } from './batch.js';

/**
 * Runs a bulk upload: each item is stored (`upload`) unless it already has a resumeId from an
 * earlier attempt, then parsed (`parse`). At most `concurrency` items run at once, and every
 * item settles on its own: one failure never stops the rest. Progress goes to `onUpdate`.
 *
 * @param {{ key: string, file: File, resumeId: string | null }[]} items
 * @param {{
 *   upload: (file: File) => Promise<{ id: string }>,
 *   parse: (resumeId: string) => Promise<{ ok: boolean, message: string }>,
 *   onUpdate: (key: string, patch: object) => void,
 *   concurrency?: number,
 * }} options
 */
export function processUploads(items, { upload, parse, onUpdate, concurrency = 2 }) {
  return runWithConcurrency(
    items,
    async (item) => {
      let resumeId = item.resumeId;
      if (!resumeId) {
        onUpdate(item.key, { stage: 'uploading', message: '' });
        const row = await upload(item.file);
        resumeId = row.id;
        onUpdate(item.key, { resumeId });
      }
      onUpdate(item.key, { stage: 'processing', message: '' });
      const result = await parse(resumeId);
      if (!result.ok) throw new Error(result.message);
      onUpdate(item.key, { stage: 'done', message: result.message });
    },
    {
      concurrency,
      onSettled: (outcome, item) => {
        if (outcome.status === 'rejected') {
          const reason = outcome.reason;
          onUpdate(item.key, { stage: 'failed', message: reason instanceof Error ? reason.message : 'Upload failed.' });
        }
      },
    }
  );
}
