"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { processUploads } from "@/lib/resume/bulk-upload";
import { parseResumeWithRetry, uploadResume } from "@/lib/resume/service";
import { validateResume } from "@/lib/resume/validation";

/** Files processed at once: gentle on the model server, and well under the per-minute limit. */
const CONCURRENCY = 2;
/** Most files one upload accepts (same as MAX_BATCH_FILES in lib/resume/validation.js). */
const MAX_BATCH_FILES = 50;

type Stage = "waiting" | "uploading" | "processing" | "done" | "failed";
type Item = {
  key: string;
  file: File;
  stage: Stage;
  message: string;
  /** Set once the file is stored: a retry then only re-runs processing. */
  resumeId: string | null;
};

const STAGE_LABEL: Record<Stage, string> = {
  waiting: "Waiting",
  uploading: "Uploading…",
  processing: "Processing…",
  done: "Done",
  failed: "Failed",
};

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Bulk resume upload: drag and drop or pick up to MAX_BATCH_FILES PDF/DOCX files. Each file is
 * checked on its own (a bad file never stops the others), stored, then parsed and embedded on
 * the model server, two at a time, waiting out the per-minute limit when it is reached.
 */
export default function ResumeUpload({ onUploaded }: { onUploaded?: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");

  const update = (key: string, patch: Partial<Item>) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const addFiles = (incoming: File[]) => {
    if (busy || !incoming.length) return;
    // Keep unfinished items; drop finished ones from an earlier batch.
    const kept = items.filter((item) => item.stage !== "done");
    const room = Math.max(MAX_BATCH_FILES - kept.length, 0);
    setNotice(incoming.length > room ? `Up to ${MAX_BATCH_FILES} files per upload: ${incoming.length - room} not added.` : "");
    const added = incoming.slice(0, room).map((file, index): Item => {
      const invalid = validateResume(file);
      return {
        key: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`,
        file,
        stage: invalid ? "failed" : "waiting",
        message: invalid || "",
        resumeId: null,
      };
    });
    setItems([...kept, ...added]);
  };

  const process = async (queue: Item[]) => {
    if (!queue.length) return;
    setBusy(true);
    setNotice("");
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session expired. Please sign in again.");

      await processUploads(queue, {
        upload: (file: File) => uploadResume(supabase, user.id, file),
        parse: (resumeId: string) => parseResumeWithRetry(supabase, resumeId),
        onUpdate: (key: string, patch: Partial<Item>) => update(key, patch),
        concurrency: CONCURRENCY,
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
      onUploaded?.();
    }
  };

  const pending = items.filter((item) => item.stage === "waiting");
  // Failed files that can be retried (not ones rejected by the file checks).
  const retryable = items.filter((item) => item.stage === "failed" && !validateResume(item.file));
  const done = items.filter((item) => item.stage === "done").length;
  const failed = items.filter((item) => item.stage === "failed").length;
  const total = items.length;

  return (
    <section className="dashboard-card resume-upload-card" aria-labelledby="upload-heading">
      <h2 id="upload-heading">Upload resumes</h2>
      <p>PDF or DOCX, up to 5 MB each. Drop or pick up to {MAX_BATCH_FILES} files at once.</p>

      <div
        className={`bulk-drop${dragging ? " bulk-drop--active" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files || []));
        }}
      >
        <p>Drag resumes here, or</p>
        <label className="dashboard-label" htmlFor="resume-files">
          Resume files
          <input
            id="resume-files"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            disabled={busy}
            onChange={(event) => {
              addFiles(Array.from(event.target.files || []));
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="bulk-actions">
        <button className="btn btn-primary" type="button" disabled={!pending.length || busy} onClick={() => void process(pending)}>
          {busy ? "Working…" : pending.length > 1 ? `Upload and process ${pending.length} files` : "Upload and process"}
        </button>
        {!busy && retryable.length > 0 && (
          <button className="dashboard-secondary" type="button" onClick={() => void process(retryable)}>
            Retry failed ({retryable.length})
          </button>
        )}
        {!busy && total > 0 && (
          <button className="dashboard-secondary" type="button" onClick={() => { setItems([]); setNotice(""); }}>
            Clear list
          </button>
        )}
      </div>

      {total > 0 && (
        <p className="eval-muted" role="status" aria-live="polite">
          {done} of {total} done{failed ? ` · ${failed} failed` : ""}
          {busy ? ` · processing ${CONCURRENCY} at a time` : ""}
        </p>
      )}
      {notice && <p className="text-error" role="alert">{notice}</p>}

      {total > 0 && (
        <ul className="bulk-list" aria-label="Files in this upload">
          {items.map((item) => (
            <li key={item.key} className={`bulk-item bulk-item--${item.stage}`}>
              <span className="bulk-item__name">{item.file.name}</span>
              <span className="eval-muted">{formatSize(item.file.size)}</span>
              <span className="bulk-item__stage">{STAGE_LABEL[item.stage]}</span>
              {item.message && <span className="bulk-item__message">{item.message}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
