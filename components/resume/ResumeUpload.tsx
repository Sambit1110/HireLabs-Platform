"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateResume } from "@/lib/resume/validation";

export default function ResumeUpload({ onUploaded }: { onUploaded?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a resume.");
      return;
    }

    const validationError = validateResume(file);
    if (validationError) {
      setMessage(validationError);
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

      const extension = file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

      // Upload actual file
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Save file information.
      // The project does not ship generated Supabase database types,
      // so the table insert is intentionally cast to avoid TypeScript
      // rejecting the valid public.resumes columns during Vercel builds.
      const resumeRecord = {
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        processing_status: "uploaded",
      };

      const { error: dbError } = await (supabase
        .from("resumes") as any)
        .insert(resumeRecord);

      if (dbError) {
        // Remove storage file if database insert fails
        await supabase.storage
          .from("resumes")
          .remove([filePath]);

        throw dbError;
      }

      setFile(null);
      setMessage("Resume uploaded successfully!");
      onUploaded?.();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="resume-upload-card">
      <h2>Upload Resume</h2>

      <p className="resume-upload-help">
        PDF or DOCX, maximum 5 MB.
      </p>

      <input
        className="resume-upload-input"
        type="file"
        accept=".pdf,.docx"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setMessage("");
        }}
      />

      {file && (
        <p className="resume-upload-selected">
          Selected: {file.name}
        </p>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || uploading}
        className="btn btn-primary resume-upload-button"
      >
        {uploading ? "Uploading..." : "Upload Resume"}
      </button>

      {message && (
        <p className="resume-upload-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
