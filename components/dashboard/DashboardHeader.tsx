import Link from "next/link";

type Page = "overview" | "library" | "results";

const PAGES: { page: Page; href: string; label: string }[] = [
  { page: "overview", href: "/dashboard", label: "Overview" },
  { page: "library", href: "/dashboard/resumes", label: "Resume library" },
  { page: "results", href: "/dashboard/results", label: "Model results" },
];

/**
 * The workspace header on every dashboard page: the HireLabs wordmark and a "Home" pill both
 * lead back to the landing page, then the dashboard sections and the account.
 */
export default function DashboardHeader({
  current,
  email,
  onLogout,
}: {
  current: Page;
  email?: string | null;
  onLogout?: () => void;
}) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header__start">
        <Link href="/" className="dashboard-brand" aria-label="HireLabs home page">
          HireLabs
        </Link>
        <Link href="/" className="dashboard-home">
          <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Home
        </Link>
      </div>

      <nav aria-label="Dashboard">
        {PAGES.map(({ page, href, label }) => (
          <Link key={page} href={href} aria-current={current === page ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>

      {(email || onLogout) && (
        <div className="dashboard-account">
          {email && <span>{email}</span>}
          {onLogout && (
            <button type="button" className="dashboard-logout" onClick={onLogout}>
              Log out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
