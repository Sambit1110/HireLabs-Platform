"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateResume } from "@/lib/resume/validation";

type SavedResume = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  processing_status: string;
  created_at: string;
};

export default function ResumeUpload({ onUploaded }: { onUploaded?: (resumes: SavedResume[]) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!files.length) {
      setMessage("Please select at least one resume.");
      return;
    }

    const invalidFile = files
      .map((file) => ({ file, error: validateResume(file) }))
      .find((item) => item.error);

    if (invalidFile) {
      setMessage(`${invalidFile.file.name}: ${invalidFile.error}`);
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please log in first.");
      }

      const saved: SavedResume[] = [];
      const failed: string[] = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setMessage(`Uploading ${index + 1} of ${files.length}: ${file.name}`);

        const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
        const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          failed.push(file.name);
          continue;
        }

        const resumeRecord = {
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type || "application/octet-stream",
          file_size: file.size,
          processing_status: "uploaded",
        };

        const { data: savedResume, error: dbError } = await (supabase
          .from("resumes") as any)
          .insert(resumeRecord)
          .select(
            "id, file_name, file_path, file_type, file_size, processing_status, created_at"
          )
          .single();

        if (dbError) {
          await supabase.storage.from("resumes").remove([filePath]);
          failed.push(file.name);
          continue;
        }

        saved.push(savedResume);
      }

      setFiles([]);
      onUploaded?.(saved);

      if (!saved.length) {
        throw new Error("None of the selected resumes could be uploaded.");
      }

      setMessage(
        failed.length
          ? `${saved.length} uploaded, ${failed.length} failed.`
          : `${saved.length} resume${saved.length === 1 ? "" : "s"} uploaded successfully!`
      );
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="resume-upload-card">
      <h2>Upload Resumes</h2>

      <p className="resume-upload-help">
        PDF or DOCX, maximum 5 MB each. Multiple files supported.
      </p>

      <input
        className="resume-upload-input"
        type="file"
        accept=".pdf,.docx"
        multiple
        onChange={(e) => {
          setFiles(Array.from(e.target.files ?? []));
          setMessage("");
        }}
      />

      {files.length > 0 && (
        <div className="resume-upload-selected">
          <strong>{files.length} file{files.length === 1 ? "" : "s"} selected</strong>
          {files.map((file) => (
            <div key={`${file.name}-${file.size}-${file.lastModified}`}>
              {file.name}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!files.length || uploading}
        className="btn btn-primary resume-upload-button"
      >
        {uploading ? "Uploading..." : "Upload Resumes"}
      </button>

      {message && (
        <p className="resume-upload-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
