"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export default function ResumeUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a resume.");
      return;
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      setMessage("Only PDF and DOCX files are allowed.");
      return;
    }

    if (file.size > MAX_SIZE) {
      setMessage("File must be smaller than 5 MB.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
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

      // Save file information
      const { error: dbError } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          processing_status: "uploaded",
        });

      if (dbError) {
        // Remove storage file if database insert fails
        await supabase.storage
          .from("resumes")
          .remove([filePath]);

        throw dbError;
      }

      setFile(null);
      setMessage("Resume uploaded successfully!");
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
    <div className="w-full max-w-md rounded-xl border p-6">
      <h2 className="text-xl font-semibold">
        Upload Resume
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        PDF or DOCX, maximum 5 MB.
      </p>

      <input
        className="mt-5 w-full"
        type="file"
        accept=".pdf,.docx"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setMessage("");
        }}
      />

      {file && (
        <p className="mt-3 text-sm">
          Selected: {file.name}
        </p>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || uploading}
        className="mt-5 rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload Resume"}
      </button>

      {message && (
        <p className="mt-3 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}