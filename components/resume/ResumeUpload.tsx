"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateResume } from "@/lib/resume/validation";

type UploadResult = { file: string; status: "uploaded" | "failed"; message: string };
export default function ResumeUpload({ onUploaded }: { onUploaded?: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<UploadResult[]>([]);

  const upload = async () => {
    if (!files.length) return;
    const invalid = files.map((file) => ({ file, error: validateResume(file) })).find((item) => item.error);
    if (invalid) { setResults([{ file: invalid.file.name, status: "failed", message: invalid.error! }]); return; }
    setBusy(true); setResults([]);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session expired. Please sign in again.");
      const outcomes: UploadResult[] = [];
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]; setProgress(`Uploading ${i + 1} of ${files.length}: ${file.name}`);
        let path = "";
        try {
          const extension = file.name.split(".").pop()?.toLowerCase() || "file";
          path = `${user.id}/${crypto.randomUUID()}.${extension}`;
          const { error: storageError } = await supabase.storage.from("resumes").upload(path, file, { contentType: file.type, upsert: false });
          if (storageError) throw storageError;
          const { data: record, error: insertError } = await (supabase.from("resumes") as any).insert({ user_id: user.id, file_name: file.name, file_path: path, file_type: file.type || (extension === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), file_size: file.size, processing_status: "uploaded" }).select("id").single();
          if (insertError) { await supabase.storage.from("resumes").remove([path]); throw insertError; }
          setProgress(`Processing ${i + 1} of ${files.length}: ${file.name}`);
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch("/api/parse-resume", { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ resumeId: record.id }) });
          const payload = await response.json();
          if (!response.ok || !payload.success) throw new Error(payload.error?.message || "Upload succeeded, but processing failed. Retry from the resume library.");
          outcomes.push({ file: file.name, status: "uploaded", message: payload.data.parser_error || "Uploaded and processed." });
        } catch (error) {
          outcomes.push({ file: file.name, status: "failed", message: error instanceof Error ? error.message : "Upload failed." });
        }
        setResults([...outcomes]);
      }
      setFiles([]); onUploaded?.();
    } catch (error) {
      setResults([{ file: "Upload", status: "failed", message: error instanceof Error ? error.message : "Upload failed." }]);
    } finally { setBusy(false); setProgress(""); }
  };

  return <section className="dashboard-card resume-upload-card" aria-labelledby="upload-heading">
    <h2 id="upload-heading">Upload resumes</h2><p>PDF or DOCX, up to 5 MB each. Select multiple files.</p>
    <label className="dashboard-label" htmlFor="resume-files">Resume files</label>
    <input id="resume-files" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple disabled={busy} onChange={(event) => { setFiles(Array.from(event.target.files || [])); setResults([]); }} />
    {files.length > 0 && <p>{files.length} file{files.length === 1 ? "" : "s"} selected</p>}
    <button className="btn btn-primary" type="button" disabled={!files.length || busy} onClick={upload}>{busy ? "Working…" : "Upload and process"}</button>
    {progress && <p role="status" aria-live="polite">{progress}</p>}
    {results.length > 0 && <ul className="upload-results" aria-live="polite">{results.map((result, index) => <li key={`${result.file}-${index}`} className={result.status === "failed" ? "text-error" : "text-success"}><strong>{result.file}:</strong> {result.message}</li>)}</ul>}
  </section>;
}
