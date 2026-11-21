
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import ResumeUpload from "@/components/resume/ResumeUpload";
import AIAnalysisPanel from "@/components/dashboard/AIAnalysisPanel";

type Resume = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  processing_status: string;
  created_at: string;
  candidate_name: string | null;
  candidate_title: string | null;
  years_experience: number | null;
  extracted_skills: string[] | null;
  parser_error: string | null;
  parsed_text: string | null;
};

type DashboardUser = {
  id: string;
  email?: string;
};

type StatusFilter =
  | "all"
  | "parsed"
  | "processing"
  | "failed";

const RESUME_COLUMNS = [
  "id",
  "file_name",
  "file_type",
  "file_size",
  "processing_status",
  "created_at",
  "candidate_name",
  "candidate_title",
  "years_experience",
  "extracted_skills",
  "parser_error",
  "parsed_text",
].join(",");

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "Unknown size";
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function statusLabel(status: string) {
  switch (status) {
    case "parsed":
      return "Parsed";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    case "uploaded":
      return "Pending";
    default:
      return status || "Unknown";
  }
}

function candidateName(resume: Resume) {
  return (
    resume.candidate_name?.trim() ||
    resume.file_name.replace(/\.[^.]+$/, "")
  );
}

function normalizedSkills(resume: Resume) {
  const skills = new Map<string, string>();

  for (const skill of resume.extracted_skills || []) {
    const trimmed = skill.trim();
    const key = trimmed.toLocaleLowerCase();

    if (key && !skills.has(key)) {
      skills.set(key, trimmed);
    }
  }

  return skills;
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="dashboard-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CandidateComparison({
  candidates,
  onClear,
}: {
  candidates: Resume[];
  onClear: () => void;
}) {
  const skillMaps = useMemo(
    () => candidates.map(normalizedSkills),
    [candidates]
  );

  const commonSkills = useMemo(() => {
    if (skillMaps.length < 2) return [];

    return Array.from(skillMaps[0].entries())
      .filter(([key]) =>
        skillMaps.every((skills) => skills.has(key))
      )
      .map(([, label]) => label)
      .sort((a, b) => a.localeCompare(b));
  }, [skillMaps]);

  const experienceValues = candidates
    .map((candidate) => candidate.years_experience)
    .filter((value): value is number =>
      value !== null && Number.isFinite(value)
    );

  const experienceDifference =
    experienceValues.length === candidates.length
      ? Math.max(...experienceValues) -
        Math.min(...experienceValues)
      : null;

  return (
    <section
      className="dashboard-resume-list"
      aria-label="Candidate comparison"
    >
      <div className="dashboard-section-heading">
        <div>
          <h2>Candidate comparison</h2>
          <p>
            Compare extracted resume evidence side by side.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-secondary"
          onClick={onClear}
        >
          Clear selection
        </button>
      </div>

      <div style={{ overflowX: "auto", marginTop: 16 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr>
              <th scope="col" style={{ padding: 12 }}>
                Attribute
              </th>

              {candidates.map((candidate) => (
                <th
                  scope="col"
                  key={candidate.id}
                  style={{ padding: 12 }}
                >
                  {candidateName(candidate)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr>
              <th scope="row" style={{ padding: 12 }}>
                Professional title
              </th>

              {candidates.map((candidate) => (
                <td key={candidate.id} style={{ padding: 12 }}>
                  {candidate.candidate_title ||
                    "Not extracted"}
                </td>
              ))}
            </tr>

            <tr>
              <th scope="row" style={{ padding: 12 }}>
                Experience
              </th>

              {candidates.map((candidate) => (
                <td key={candidate.id} style={{ padding: 12 }}>
                  {candidate.years_experience !== null
                    ? `${candidate.years_experience} years`
                    : "Not extracted"}
                </td>
              ))}
            </tr>

            <tr>
              <th scope="row" style={{ padding: 12 }}>
                Extracted skills
              </th>

              {candidates.map((candidate, index) => (
                <td key={candidate.id} style={{ padding: 12 }}>
                  {skillMaps[index].size}
                </td>
              ))}
            </tr>

            <tr>
              <th scope="row" style={{ padding: 12 }}>
                Skills
              </th>

              {candidates.map((candidate, index) => (
                <td key={candidate.id} style={{ padding: 12 }}>
                  {Array.from(skillMaps[index].values())
                    .sort((a, b) => a.localeCompare(b))
                    .join(", ") || "No skills extracted"}
                </td>
              ))}
            </tr>

            <tr>
              <th scope="row" style={{ padding: 12 }}>
                Skills not shared by all selected candidates
              </th>

              {candidates.map((candidate, index) => {
                const commonKeys = new Set(
                  commonSkills.map((skill) =>
                    skill.toLocaleLowerCase()
                  )
                );

                const distinct = Array.from(
                  skillMaps[index].entries()
                )
                  .filter(([key]) => !commonKeys.has(key))
                  .map(([, label]) => label)
                  .sort((a, b) => a.localeCompare(b));

                return (
                  <td key={candidate.id} style={{ padding: 12 }}>
                    {distinct.join(", ") || "None"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="dashboard-stats" style={{ marginTop: 20 }}>
        <Stat
          label="Candidates compared"
          value={candidates.length}
        />

        <Stat
          label="Common extracted skills"
          value={commonSkills.length}
        />

        <Stat
          label="Combined distinct skills"
          value={
            new Set(
              skillMaps.flatMap((skills) =>
                Array.from(skills.keys())
              )
            ).size
          }
        />
      </div>

      <div className="dashboard-resume" style={{ marginTop: 16 }}>
        <div className="resume-main">
          <h3>Recruiter insights</h3>

          <p>
            <strong>Common skills:</strong>{" "}
            {commonSkills.join(", ") ||
              "No common skills were extracted."}
          </p>

          <p>
            <strong>Experience difference:</strong>{" "}
            {experienceDifference !== null
              ? `${experienceDifference.toFixed(1)} years`
              : "Insufficient extracted experience data"}
          </p>

          <p className="resume-note">
            These insights are descriptive and based on
            extracted resume fields. A fair, job-specific
            evaluation requires the job description and
            verified candidate evidence. Missing extracted
            data does not necessarily mean a candidate
            lacks a skill.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function DashboardApp() {
  const router = useRouter();
  const pathname = usePathname();

  const library = pathname === "/dashboard/resumes";

  const [user, setUser] = useState<DashboardUser | null>(
    null
  );

  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const [resumes, setResumes] = useState<Resume[]>([]);

  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [selectedIds, setSelectedIds] = useState<
    string[]
  >([]);

  const load = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { data, error: queryError } = await supabase
        .from("resumes")
        .select(RESUME_COLUMNS)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (queryError) {
        throw queryError;
      }

      const records = (data || []) as Resume[];

      setResumes(records);

      const validIds = new Set(
        records
          .filter(
            (resume) =>
              resume.processing_status === "parsed"
          )
          .map((resume) => resume.id)
      );

      setSelectedIds((previous) =>
        previous.filter((id) => validIds.has(id))
      );
    } catch {
      setError(
        "Your resume library could not be loaded. Please refresh."
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;

    const supabase = createClient();

    void supabase.auth
      .getUser()
      .then(({ data, error: authError }) => {
        if (!active) return;

        if (authError || !data.user) {
          router.replace("/");
          return;
        }

        setUser({
          id: data.user.id,
          email: data.user.email,
        });
      })
      .catch(() => {
        if (active) router.replace("/");
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session && active) {
          router.replace("/");
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (user) {
      void load();
    }
  }, [user, load]);

  const stats = useMemo(() => {
    return {
      total: resumes.length,

      parsed: resumes.filter(
        (resume) =>
          resume.processing_status === "parsed"
      ).length,

      pending: resumes.filter(
        (resume) =>
          resume.processing_status === "uploaded" ||
          resume.processing_status === "processing"
      ).length,

      failed: resumes.filter(
        (resume) =>
          resume.processing_status === "failed"
      ).length,
    };
  }, [resumes]);

  const filteredResumes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return resumes.filter((resume) => {
      const matchesSearch =
        !query ||
        [
          resume.candidate_name || "",
          resume.file_name,
          resume.candidate_title || "",
          ...(resume.extracted_skills || []),
        ].some((value) =>
          value.toLocaleLowerCase().includes(query)
        );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "processing"
          ? ["uploaded", "processing"].includes(
              resume.processing_status
            )
          : resume.processing_status === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [resumes, search, statusFilter]);

  const selectedCandidates = useMemo(() => {
    return selectedIds
      .map((id) => resumes.find((resume) => resume.id === id))
      .filter((resume): resume is Resume => Boolean(resume));
  }, [resumes, selectedIds]);

  const aiCandidates = useMemo(() => {
    return resumes
      .filter(
        (resume) =>
          resume.processing_status === "parsed" &&
          Boolean(resume.parsed_text)
      )
      .map((resume) => ({
        ...resume,
        parsed_text: resume.parsed_text || "",
      }));
  }, [resumes]);

  const visibleResumes = library
    ? filteredResumes
    : filteredResumes.slice(0, 5);

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, id];
    });
  };

  const logout = async () => {
    try {
      const { error: logoutError } =
        await createClient().auth.signOut();

      if (logoutError) throw logoutError;

      router.replace("/");
    } catch {
      setError("Could not log out. Please try again.");
    }
  };

  const retry = async (resume: Resume) => {
    setActionId(resume.id);
    setError("");

    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();

      if (!session?.access_token) {
        throw new Error("Session expired. Please sign in again.");
      }

      const response = await fetch("/api/parse-resume", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeId: resume.id,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error?.message ||
            "Could not process this resume."
        );
      }

      await load();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not process this resume."
      );
    } finally {
      setActionId("");
    }
  };

  const remove = async (resume: Resume) => {
    if (
      !window.confirm(
        `Delete "${resume.file_name}"? This removes the file and its resume record.`
      )
    ) {
      return;
    }

    setActionId(resume.id);
    setError("");

    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();

      if (!session?.access_token) {
        throw new Error("Session expired. Please sign in again.");
      }

      const response = await fetch(
        `/api/resumes/${encodeURIComponent(resume.id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.error?.message ||
            "Could not delete resume."
        );
      }

      setResumes((current) =>
        current.filter((item) => item.id !== resume.id)
      );

      setSelectedIds((current) =>
        current.filter((id) => id !== resume.id)
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not delete resume."
      );
    } finally {
      setActionId("");
    }
  };

  if (authLoading || !user) {
    return (
      <main className="dashboard-shell">
        <p role="status">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link
          href="/dashboard"
          className="dashboard-brand"
        >
          HireLabs
        </Link>

        <nav aria-label="Dashboard">
          <Link
            href="/dashboard"
            aria-current={
              !library ? "page" : undefined
            }
          >
            Overview
          </Link>

          <Link
            href="/dashboard/resumes"
            aria-current={
              library ? "page" : undefined
            }
          >
            Resume library
          </Link>
        </nav>

        <div className="dashboard-account">
          <span>{user.email}</span>

          <button
            type="button"
            className="dashboard-logout"
            onClick={() => void logout()}
          >
            Log out
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-heading">
          <div>
            <p className="dashboard-eyebrow">
              RECRUITER WORKSPACE
            </p>

            <h1>
              {library
                ? "Resume library"
                : "Welcome to HireLabs"}
            </h1>

            <p>
              {library
                ? "Manage candidates, compare profiles, and review resume evidence."
                : `Signed in as ${user.email || "your account"}.`}
            </p>
          </div>

          <button
            type="button"
            className="dashboard-secondary"
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && (
          <p className="dashboard-alert" role="alert">
            {error}
          </p>
        )}

        {!library && (
          <div
            className="dashboard-stats"
            aria-label="Resume statistics"
          >
            <Stat label="Total resumes" value={stats.total} />
            <Stat label="Parsed" value={stats.parsed} />
            <Stat label="Pending" value={stats.pending} />
            <Stat label="Failed" value={stats.failed} />
          </div>
        )}

        <ResumeUpload
          onUploaded={() => void load()}
        />

        <section
          className="dashboard-resume-list"
          aria-label="Candidate management"
        >
          <div className="dashboard-section-heading">
            <div>
              <h2>Candidate management</h2>
              <p>
                Search, filter, and select candidates for
                comparison.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 16,
            }}
          >
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search candidate, title, or skill"
              aria-label="Search resumes"
              style={{
                flex: "1 1 240px",
                padding: 12,
                border: "1px solid #888",
                borderRadius: 8,
                background: "transparent",
                color: "inherit",
              }}
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as StatusFilter
                )
              }
              aria-label="Filter by processing status"
              style={{
                padding: 12,
                borderRadius: 8,
              }}
            >
              <option value="all">All statuses</option>
              <option value="parsed">Parsed</option>
              <option value="processing">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <p className="resume-note" style={{ marginTop: 12 }}>
            {selectedIds.length} of 3 candidates selected
            for comparison. Select at least 2 parsed resumes.
          </p>
        </section>

        {selectedCandidates.length >= 2 && (
          <CandidateComparison
            candidates={selectedCandidates}
            onClear={() => setSelectedIds([])}
          />
        )}

        <section aria-label="AI recruitment analysis">
          <div className="dashboard-section-heading">
            <div>
              <h2>AI recruitment analysis</h2>
              <p>
                Review AI-powered candidate evaluations and
                recruitment insights.
              </p>
            </div>
          </div>

          <AIAnalysisPanel candidates={aiCandidates} />
        </section>

        {!library && (
          <div className="dashboard-section-heading">
            <h2>Recent uploads</h2>

            <Link href="/dashboard/resumes">
              Open resume library
            </Link>
          </div>
        )}

        {library && (
          <div className="dashboard-section-heading">
            <h2>All resumes</h2>
            <span>
              {filteredResumes.length} results
            </span>
          </div>
        )}

        <section
          className="dashboard-resume-list"
          aria-label={
            library ? "All resumes" : "Recent uploads"
          }
        >
          {loading ? (
            <div
              className="dashboard-skeleton"
              role="status"
            >
              Loading resumes…
            </div>
          ) : visibleResumes.length === 0 ? (
            <div className="dashboard-empty">
              <h2>No matching resumes</h2>
              <p>
                {resumes.length === 0
                  ? "Upload a PDF or DOCX to start building your resume library."
                  : "Try changing your search or status filter."}
              </p>
            </div>
          ) : (
            visibleResumes.map((resume) => {
              const selected = selectedIds.includes(
                resume.id
              );

              const canCompare =
                resume.processing_status === "parsed";

              return (
                <article
                  className="dashboard-resume"
                  key={resume.id}
                >
                  <div className="resume-main">
                    <div className="resume-title-line">
                      <h3>
                        {candidateName(resume)}
                      </h3>

                      <span
                        className={`resume-status status-${resume.processing_status}`}
                      >
                        {statusLabel(
                          resume.processing_status
                        )}
                      </span>
                    </div>

                    <p className="resume-filename">
                      {resume.file_name}
                    </p>

                    <p>
                      {resume.candidate_title ||
                        "Title not extracted"}

                      {resume.years_experience !== null
                        ? ` · ${resume.years_experience} years experience`
                        : ""}
                    </p>

                    <p className="resume-meta">
                      {resume.file_type === "application/pdf"
                        ? "PDF"
                        : "DOCX"}
                      {" · "}
                      {formatSize(resume.file_size)}
                      {" · "}
                      {new Date(
                        resume.created_at
                      ).toLocaleDateString()}
                    </p>

                    {resume.extracted_skills?.length ? (
                      <p className="resume-skills">
                        <strong>Skills: </strong>
                        {resume.extracted_skills.join(", ")}
                      </p>
                    ) : null}

                    {resume.parser_error && (
                      <p className="resume-note">
                        {resume.parser_error}
                      </p>
                    )}

                    {canCompare && (
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 12,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={
                            !selected &&
                            selectedIds.length >= 3
                          }
                          onChange={() =>
                            toggleSelection(resume.id)
                          }
                        />

                        Compare candidate
                      </label>
                    )}
                  </div>

                  <div className="resume-actions">
                    {[
                      "failed",
                      "uploaded",
                      "processing",
                    ].includes(
                      resume.processing_status
                    ) && (
                      <button
                        type="button"
                        className="dashboard-secondary"
                        disabled={Boolean(actionId)}
                        onClick={() =>
                          void retry(resume)
                        }
                      >
                        {actionId === resume.id
                          ? "Processing…"
                          : resume.processing_status ===
                              "processing"
                            ? "Retry processing"
                            : "Process resume"}
                      </button>
                    )}

                    <button
                      type="button"
                      className="dashboard-danger"
                      disabled={Boolean(actionId)}
                      onClick={() =>
                        void remove(resume)
                      }
                    >
                      {actionId === resume.id
                        ? "Working…"
                        : "Delete"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
