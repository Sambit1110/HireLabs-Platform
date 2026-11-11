"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Candidate = { id: string; candidate_name: string | null; candidate_title: string | null; extracted_skills: string[] | null; parsed_text: string | null; years_experience: number | null };
export default function AIAnalysisPanel({ candidates }: { candidates: Candidate[] }) {
  const [candidateId, setCandidateId] = useState("");
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const analyze = async (mode: "candidate" | "role") => {
    setBusy(true); setError(""); setResult(null);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");
      const selected = candidates.find((item) => item.id === candidateId);
      if (mode === "candidate" && !selected) throw new Error("Choose a parsed resume for candidate analysis.");
      const body = mode === "role" ? { mode, role, jobDescription } : {
        mode, role, jobDescription,
        candidate: { name: selected?.candidate_name, title: selected?.candidate_title, skills: (selected?.extracted_skills || []).join(" "), parsedText: selected?.parsed_text || "", yearsExperience: selected?.years_experience },
      };
      const response = await fetch("/api/ai-analyze", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || "AI analysis could not be completed.");
      setResult(payload.data.result);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "AI analysis could not be completed."); }
    finally { setBusy(false); }
  };

  return <section className="dashboard-card ai-analysis" aria-labelledby="ai-analysis-heading">
    <h2 id="ai-analysis-heading">AI analysis</h2>
    <p>Generate a role screening brief or an evidence based candidate review from a parsed resume. Review outputs with human judgment.</p>
    <div className="ai-analysis-fields">
      <label className="dashboard-label">Target role<input className="ai-analysis-input" value={role} onChange={(event) => setRole(event.target.value)} maxLength={300} placeholder="e.g. Product Engineer" /></label>
      <label className="dashboard-label">Job description<textarea className="ai-analysis-input" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} maxLength={12000} rows={5} placeholder="Paste the role description" /></label>
      <label className="dashboard-label">Candidate for review<select className="ai-analysis-input" value={candidateId} onChange={(event) => setCandidateId(event.target.value)}><option value="">Choose a parsed resume</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.candidate_name || "Unnamed candidate"} · {candidate.candidate_title || "No title"}</option>)}</select></label>
    </div>
    <div className="ai-analysis-actions"><button className="dashboard-secondary" type="button" disabled={busy || !role.trim() || !jobDescription.trim()} onClick={() => void analyze("role")}>{busy ? "Analyzing…" : "Create role brief"}</button><button className="dashboard-secondary" type="button" disabled={busy || !role.trim() || !jobDescription.trim() || !candidateId} onClick={() => void analyze("candidate")}>Review candidate</button></div>
    {error && <p role="alert" className="dashboard-alert">{error}</p>}
    {result && <pre className="ai-analysis-result" aria-live="polite">{JSON.stringify(result, null, 2)}</pre>}
  </section>;
}
