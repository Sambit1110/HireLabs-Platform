"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ResumeUpload from "@/components/resume/ResumeUpload";
import { createClient } from "@/lib/supabase/client";

type Resume = {
  id: string;
  file_name: string;
  processing_status: string;
  created_at: string;
};

export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [message, setMessage] = useState("Loading your resumes…");

  const loadResumes = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }
      const { data, error } = await supabase
        .from("resumes")
        .select("id, file_name, processing_status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setResumes(data ?? []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load resumes.");
    }
  }, [router]);

  useEffect(() => { void loadResumes(); }, [loadResumes]);

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">HireLabs workspace</p>
          <h1>Resume Management</h1>
          <p>Upload private candidate files and track their processing status.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => createClient().auth.signOut().then(() => router.replace("/"))}>Sign out</button>
      </header>
      <div className="dashboard-grid">
        <ResumeUpload onUploaded={loadResumes} />
        <section className="resume-list" aria-live="polite">
          <h2>Uploaded resumes</h2>
          {message && <p>{message}</p>}
          {!message && resumes.length === 0 && <p>No resumes yet. Upload the first candidate file.</p>}
          {resumes.map((resume) => (
            <article className="resume-row" key={resume.id}>
              <div><strong>{resume.file_name}</strong><span>{new Date(resume.created_at).toLocaleDateString()}</span></div>
              <span className="badge badge-cyan">{resume.processing_status}</span>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
