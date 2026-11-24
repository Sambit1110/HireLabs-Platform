
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
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { isEmptyQuery, matchResume, parseSkillQuery } from "@/lib/resume/skill-search";
import { runWithConcurrency } from "@/lib/resume/batch";
import { parseResumeWithRetry } from "@/lib/resume/service";
import AIAnalysisPanel, {
  type AnalysisPreset,
} from "@/components/dashboard/AIAnalysisPanel";
import CandidateRanking, { type MatchSignals } from "@/components/dashboard/CandidateRanking";
import {
  isParsedStatus,
  isPendingStatus,
  statusLabel,
} from "@/lib/resume/status";
import { blindAliases, blindSkills, blindTitle, candidateDisplayName } from "@/lib/resume/blind-review";

/** Per-browser memory of the Blind review switch (a convenience only: it can be unavailable). */
const BLIND_STORAGE_KEY = "hirelabs:blind-review";

function readBlindPreference() {
  try {
    return window.localStorage.getItem(BLIND_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

function saveBlindPreference(on: boolean) {
  try {
    window.localStorage.setItem(BLIND_STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Private windows or blocked storage: the switch still works for this visit.
  }
}

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

function CandidateComparison({
  candidates,
  label,
  onClear,
}: {
  candidates: Resume[];
  label: (resume: Resume) => string;
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
        <table className="compare-table">
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
                  {label(candidate)}
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
  // "Re-process all": progress of re-extracting every stored resume with the current rules.
  const [reprocess, setReprocess] = useState<{ done: number; failed: number; total: number } | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [selectedIds, setSelectedIds] = useState<
    string[]
  >([]);

  const [analysisPreset, setAnalysisPreset] =
    useState<AnalysisPreset | null>(null);

  // Blind review hides names, file names and contact details on screen and in exports.
  const [blind, setBlind] = useState(false);
  useEffect(() => {
    // Read after mount: the server render has no localStorage.
    setBlind(readBlindPreference());
  }, []);
  const toggleBlind = () => {
    setBlind((on) => {
      saveBlindPreference(!on);
      return !on;
    });
  };
  const aliases = useMemo(() => blindAliases(resumes), [resumes]);
  const candidateName = useCallback(
    (resume: Resume) => candidateDisplayName(resume, { blind, aliases }),
    [blind, aliases]
  );
  // The title and skills to show: in blind review, without names, links or contact details.
  const shownTitle = (resume: Resume) =>
    blind ? blindTitle(resume, candidateName(resume)) : resume.candidate_title;
  const shownSkills = (resume: Resume) =>
    blind ? blindSkills(resume.extracted_skills, resume) : resume.extracted_skills || [];

  const explainCandidate = (
    candidateId: string,
    role: string,
    jobDescription: string,
    signals: MatchSignals | null
  ) => {
    setAnalysisPreset((current) => ({
      key: (current?.key || 0) + 1,
      candidateId,
      role,
      jobDescription,
      signals,
    }));
  };

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

      const records = (data || []) as unknown as Resume[];

      setResumes(records);

      const validIds = new Set(
        records
          .filter(
            (resume) =>
              isParsedStatus(resume.processing_status)
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

      parsed: resumes.filter((resume) =>
        isParsedStatus(resume.processing_status)
      ).length,

      pending: resumes.filter((resume) =>
        isPendingStatus(resume.processing_status)
      ).length,

      failed: resumes.filter(
        (resume) =>
          resume.processing_status === "failed"
      ).length,
    };
  }, [resumes]);

  // Skill search: "SQL + Python, 3+ years", aliases understood, resume text searched too.
  const parsedSearch = useMemo(() => parseSkillQuery(search), [search]);
  const searchMatches = useMemo(() => {
    const matches = new Map<string, string[]>();
    for (const resume of resumes) {
      const result = matchResume(resume, parsedSearch);
      if (result.match) matches.set(resume.id, result.matched);
    }
    return matches;
  }, [resumes, parsedSearch]);

  const filteredResumes = useMemo(() => {
    return resumes.filter((resume) => {
      const matchesSearch = searchMatches.has(resume.id);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "processing"
          ? isPendingStatus(resume.processing_status)
          : statusFilter === "parsed"
            ? isParsedStatus(resume.processing_status)
            : resume.processing_status === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [resumes, searchMatches, statusFilter]);

  const reprocessTargets = resumes.filter((resume) => !isPendingStatus(resume.processing_status));
  const reprocessBusy = reprocess !== null && reprocess.done < reprocess.total;

  const reprocessAll = async () => {
    if (reprocessBusy || !reprocessTargets.length) return;
    if (!window.confirm(`Re-process all ${reprocessTargets.length} resumes? Profiles and skills are extracted again with the latest rules. This takes about ${Math.max(1, Math.ceil(reprocessTargets.length / 8))} min.`)) return;
    const supabase = createClient();
    setReprocess({ done: 0, failed: 0, total: reprocessTargets.length });
    await runWithConcurrency(
      reprocessTargets,
      async (resume) => {
        const result = await parseResumeWithRetry(supabase, resume.id);
        if (!result.ok) throw new Error(result.message);
      },
      {
        concurrency: 2,
        onSettled: (outcome) =>
          setReprocess((current) => current && {
            ...current,
            done: current.done + 1,
            failed: current.failed + (outcome.status === "rejected" ? 1 : 0),
          }),
      }
    );
    await load();
  };

  const searchSummary = isEmptyQuery(parsedSearch)
    ? ""
    : `${searchMatches.size} of ${resumes.length} resume${resumes.length === 1 ? "" : "s"} match ` +
      [
        ...parsedSearch.terms.map((term) => term.label),
        ...(parsedSearch.minYears !== null ? [`${parsedSearch.minYears}+ years`] : []),
      ].join(" + ");

  const selectedCandidates = useMemo(() => {
    return selectedIds
      .map((id) => resumes.find((resume) => resume.id === id))
      .filter((resume): resume is Resume => Boolean(resume));
  }, [resumes, selectedIds]);

  const aiCandidates = useMemo(() => {
    return resumes
      .filter(
        (resume) =>
          isParsedStatus(resume.processing_status) &&
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
        `Delete ${blind ? `the resume of ${candidateName(resume)}` : `"${resume.file_name}"`}? This removes the file and its resume record.`
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

  // Overview order: the main task (ranking a job) comes first once there are parsed resumes.
  const rankFirst = !library && stats.parsed > 0;

  const nextStep =
    stats.total === 0
      ? "Upload resumes to start ranking candidates for a job."
      : stats.pending > 0
        ? `${stats.pending} resume${stats.pending === 1 ? " is" : "s are"} still processing; ${stats.parsed} ready to rank.`
        : stats.failed > 0
          ? `${stats.parsed} resume${stats.parsed === 1 ? "" : "s"} ready to rank. ${stats.failed} failed: retry ${stats.failed === 1 ? "it" : "them"} below.`
          : `${stats.parsed} resume${stats.parsed === 1 ? "" : "s"} ready to rank. Paste a job to see who fits.`;

  const showFailed = () => {
    setStatusFilter("failed");
    document.getElementById("candidates")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const rankBlock = (
    <section id="rank" className="dashboard-anchor" aria-label="Rank and evaluate candidates">

      <CandidateRanking
        resumes={resumes}
        onExplain={explainCandidate}
        blind={blind}
        aliases={aliases}
      />

      <AIAnalysisPanel
        candidates={aiCandidates}
        blind={blind}
        aliases={aliases}
        preset={analysisPreset}
        reprocessingId={actionId}
        onReprocess={(resumeId) => {
          const resume = resumes.find((item) => item.id === resumeId);
          if (resume) void retry(resume);
        }}
      />
    </section>
  );

  const uploadBlock = (
    <div id="upload" className="dashboard-anchor">
      <ResumeUpload
        onUploaded={() => void load()}
      />
    </div>
  );

  const managementBlock = (
    <>
      <section
        id="candidates"
        className="dashboard-resume-list dashboard-anchor"
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
            placeholder="Search skills (e.g. SQL + Python, 3+ years) or a name"
            aria-label="Search resumes by skill, years of experience or name"
            className="dashboard-search"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as StatusFilter
              )
            }
            aria-label="Filter by processing status"
            className="dashboard-select"
          >
            <option value="all">All statuses</option>
            <option value="parsed">Parsed</option>
            <option value="processing">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {searchSummary && (
          <p className="eval-muted" role="status" style={{ marginTop: 12 }}>
            {searchSummary}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 12 }}>
          <button
            type="button"
            className="dashboard-secondary"
            disabled={reprocessBusy || reprocessTargets.length === 0}
            onClick={() => void reprocessAll()}
            title="Extract profiles and skills again for every resume, with the latest rules"
          >
            {reprocessBusy ? "Re-processing…" : `Re-process all (${reprocessTargets.length})`}
          </button>
          {reprocess && (
            <span className="eval-muted" role="status" aria-live="polite">
              {reprocess.done} of {reprocess.total} re-processed
              {reprocess.failed ? ` · ${reprocess.failed} failed` : ""}
              {!reprocessBusy ? " · done" : ""}
            </span>
          )}
        </div>

        <p className="resume-note" style={{ marginTop: 12 }}>
          {selectedIds.length} of 3 candidates selected
          for comparison. Select at least 2 parsed resumes.
        </p>
      </section>

      {selectedCandidates.length >= 2 && (
        <CandidateComparison
          candidates={selectedCandidates.map((resume) => ({
            ...resume,
            candidate_title: shownTitle(resume),
            extracted_skills: shownSkills(resume),
          }))}
          label={candidateName}
          onClear={() => setSelectedIds([])}
        />
      )}
    </>
  );

  if (authLoading || !user) {
    return (
      <main className="dashboard-shell">
        <p role="status">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <DashboardHeader
        current={library ? "library" : "overview"}
        email={user.email}
        onLogout={() => void logout()}
      />

      <div className="dashboard-content">
        <div className="dashboard-heading">
          <div>
            <h1>{library ? "Resume library" : "Welcome back"}</h1>
            <p>
              {library
                ? "Search, compare and re-process every resume you have uploaded."
                : nextStep}
            </p>
          </div>

          <div className="dashboard-heading__actions">
            {!library && (
              <a className="btn btn-primary" href={stats.parsed > 0 ? "#rank" : "#upload"}>
                {stats.parsed > 0 ? "Rank candidates" : "Upload resumes"}
              </a>
            )}
            <button
              type="button"
              className={`dashboard-secondary blind-toggle${blind ? " is-on" : ""}`}
              aria-pressed={blind}
              onClick={toggleBlind}
              title="Hide candidate names, file names and contact details while you review"
            >
              Blind review: {blind ? "on" : "off"}
            </button>
            <button
              type="button"
              className="dashboard-secondary"
              disabled={loading}
              onClick={() => void load()}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {blind && (
          <p className="blind-banner" role="note">
            Blind review is on. Names, file names, resume text and contact details are hidden
            on this page and in exports, and candidates are shown as Candidate 1, 2, 3 (in upload
            order). Scores do not change.
          </p>
        )}

        {error && (
          <p className="dashboard-alert" role="alert">
            {error}
          </p>
        )}

        {!library && stats.total > 0 && (
          <section className="dashboard-pipeline" aria-label="Resume pipeline">
            <div
              className="dashboard-pipeline__bar"
              role="img"
              aria-label={`${stats.parsed} parsed, ${stats.pending} pending and ${stats.failed} failed, of ${stats.total} resumes`}
            >
              {stats.parsed > 0 && <span className="is-parsed" style={{ flexGrow: stats.parsed }} />}
              {stats.pending > 0 && <span className="is-pending" style={{ flexGrow: stats.pending }} />}
              {stats.failed > 0 && <span className="is-failed" style={{ flexGrow: stats.failed }} />}
            </div>
            <ul className="dashboard-pipeline__legend">
              <li>
                <strong>{stats.total}</strong> resume{stats.total === 1 ? "" : "s"}
              </li>
              <li>
                <span className="dashboard-dot is-parsed" aria-hidden="true" />
                <strong>{stats.parsed}</strong> parsed
              </li>
              <li>
                <span className="dashboard-dot is-pending" aria-hidden="true" />
                <strong>{stats.pending}</strong> pending
              </li>
              <li>
                <span className="dashboard-dot is-failed" aria-hidden="true" />
                {stats.failed > 0 ? (
                  <button type="button" className="dashboard-link" onClick={showFailed}>
                    <strong>{stats.failed}</strong> failed: show them
                  </button>
                ) : (
                  <>
                    <strong>0</strong> failed
                  </>
                )}
              </li>
            </ul>
          </section>
        )}

        {rankFirst ? (
          <>
            {rankBlock}
            {uploadBlock}
            {managementBlock}
          </>
        ) : (
          <>
            {uploadBlock}
            {managementBlock}
            {rankBlock}
          </>
        )}

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
                isParsedStatus(resume.processing_status);

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
                      {blind ? "File name hidden (blind review)" : resume.file_name}
                    </p>

                    <p>
                      {shownTitle(resume) ||
                        (blind ? "Title hidden or not extracted" : "Title not extracted")}

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

                    {shownSkills(resume).length ? (
                      <p className="resume-skills">
                        <strong>Skills: </strong>
                        {shownSkills(resume).join(", ")}
                      </p>
                    ) : null}

                    {(searchMatches.get(resume.id)?.length ?? 0) > 0 && (
                      <ul className="eval-chips" aria-label="Searched skills found in this resume">
                        {searchMatches.get(resume.id)!.map((skill) => (
                          <li key={skill} className="eval-chip eval-chip--match">
                            ✓ {skill}
                          </li>
                        ))}
                      </ul>
                    )}

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
                    {(resume.processing_status === "failed" ||
                      isPendingStatus(
                        resume.processing_status
                      )) && (
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
