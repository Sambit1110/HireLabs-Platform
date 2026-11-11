"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ResumeUpload from "@/components/resume/ResumeUpload";
import AIAnalysisPanel from "@/components/dashboard/AIAnalysisPanel";

type Resume = { id: string; file_name: string; file_type: string; file_size: number; processing_status: string; created_at: string; candidate_name: string | null; candidate_title: string | null; years_experience: number | null; extracted_skills: string[] | null; parser_error: string | null; parsed_text: string | null };
const columns = "id,file_name,file_type,file_size,processing_status,created_at,candidate_name,candidate_title,years_experience,extracted_skills,parser_error,parsed_text";

function formatSize(bytes: number) { return `${(bytes / (1024 * 1024)).toFixed(2)} MB`; }
function statusLabel(status: string) { return status === "parsed" ? "Parsed" : status === "processing" ? "Processing" : status === "failed" ? "Failed" : "Pending"; }

export default function DashboardApp() {
  const router = useRouter(); const pathname = usePathname(); const library = pathname === "/dashboard/resumes";
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true); const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]); const [error, setError] = useState(""); const [actionId, setActionId] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    const { data, error: queryError } = await createClient().from("resumes").select(columns).eq("user_id", user.id).order("created_at", { ascending: false });
    if (queryError) setError("Your resume library could not be loaded. Please refresh.");
    else setResumes((data || []) as Resume[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (authError || !data.user) router.replace("/");
      else { setUser({ id: data.user.id, email: data.user.email }); setAuthLoading(false); }
    }).catch(() => router.replace("/"));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => { if (user) void load(); }, [user, load]);

  const logout = async () => { await createClient().auth.signOut(); router.replace("/"); };
  const retry = async (resume: Resume) => {
    setActionId(resume.id); setError("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const response = await fetch("/api/parse-resume", { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ resumeId: resume.id }) });
      const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.error?.message || "Could not process this resume.");
      await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not process this resume."); }
    finally { setActionId(""); }
  };
  const remove = async (resume: Resume) => {
    if (!window.confirm(`Delete “${resume.file_name}”? This removes the file and its resume record.`)) return;
    setActionId(resume.id); setError("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const response = await fetch(`/api/resumes/${resume.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session?.access_token}` } });
      const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload.error?.message || "Could not delete resume.");
      setResumes((items) => items.filter((item) => item.id !== resume.id));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not delete resume."); }
    finally { setActionId(""); }
  };

  if (authLoading) return <main className="dashboard-shell"><p role="status">Checking your session…</p></main>;
  const parsed = resumes.filter((item) => item.processing_status === "parsed").length;
  const failed = resumes.filter((item) => item.processing_status === "failed").length;
  const pending = resumes.filter((item) => item.processing_status === "uploaded" || item.processing_status === "processing").length;
  const list = library ? resumes : resumes.slice(0, 5);

  return <main className="dashboard-shell">
    <header className="dashboard-header"><Link href="/dashboard" className="dashboard-brand">HireLabs</Link><nav aria-label="Dashboard"><Link aria-current={!library ? "page" : undefined} href="/dashboard">Overview</Link><Link aria-current={library ? "page" : undefined} href="/dashboard/resumes">Resume library</Link></nav><div className="dashboard-account"><span>{user?.email}</span><button type="button" className="dashboard-logout" onClick={logout}>Log out</button></div></header>
    <div className="dashboard-content">
      <div className="dashboard-heading"><div><p className="dashboard-eyebrow">YOUR WORKSPACE</p><h1>{library ? "Resume library" : "Welcome to HireLabs"}</h1><p>{library ? "Manage and review your private resume collection." : `Signed in as ${user?.email || "your account"}.`}</p></div>{library && <button type="button" onClick={() => void load()} className="dashboard-secondary">Refresh</button>}</div>
      {error && <p className="dashboard-alert" role="alert">{error}</p>}
      {!library && <div className="dashboard-stats" aria-label="Resume statistics"><Stat label="Total resumes" value={resumes.length} /><Stat label="Parsed" value={parsed} /><Stat label="Pending" value={pending} /><Stat label="Failed" value={failed} /></div>}
      {!library && <ResumeUpload onUploaded={() => void load()} />}
      <AIAnalysisPanel candidates={resumes.filter((resume) => resume.processing_status === "parsed" && resume.parsed_text).map((resume) => ({ ...resume, parsed_text: resume.parsed_text || "" }))} />
      {!library && <div className="dashboard-section-heading"><h2>Recent uploads</h2><Link href="/dashboard/resumes">Open resume library</Link></div>}
      {library && <ResumeUpload onUploaded={() => void load()} />}
      <section className="dashboard-resume-list" aria-label={library ? "All resumes" : "Recent uploads"}>
        {loading ? <div className="dashboard-skeleton" role="status">Loading resumes…</div> : list.length === 0 ? <div className="dashboard-empty"><h2>No resumes yet</h2><p>Upload a PDF or DOCX to start building your private resume library.</p></div> : list.map((resume) => <article className="dashboard-resume" key={resume.id}>
          <div className="resume-main"><div className="resume-title-line"><h3>{resume.candidate_name || resume.file_name.replace(/\.[^.]+$/, "")}</h3><span className={`resume-status status-${resume.processing_status}`}>{statusLabel(resume.processing_status)}</span></div><p className="resume-filename">{resume.file_name}</p><p>{resume.candidate_title || "Title not extracted"}{resume.years_experience != null ? ` · ${resume.years_experience} years experience` : ""}</p><p className="resume-meta">{resume.file_type === "application/pdf" ? "PDF" : "DOCX"} · {formatSize(resume.file_size)} · {new Date(resume.created_at).toLocaleDateString()}</p>{resume.extracted_skills?.length ? <p className="resume-skills"><strong>Skills:</strong> {resume.extracted_skills.join(", ")}</p> : null}{resume.parser_error && <p className="resume-note">{resume.parser_error}</p>}</div>
          <div className="resume-actions">{(resume.processing_status === "failed" || resume.processing_status === "uploaded" || resume.processing_status === "processing") && <button type="button" className="dashboard-secondary" disabled={!!actionId} onClick={() => void retry(resume)}>{actionId === resume.id ? "Processing…" : resume.processing_status === "processing" ? "Retry processing" : "Process resume"}</button>}<button type="button" className="dashboard-danger" disabled={!!actionId} onClick={() => void remove(resume)}>{actionId === resume.id ? "Working…" : "Delete"}</button></div>
        </article>)}
      </section>
    </div>
  </main>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="dashboard-stat"><span>{label}</span><strong>{value}</strong></div>; }
