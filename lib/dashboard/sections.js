/**
 * The "On this page" navigation of the dashboard: which sections exist, in the order the page
 * shows them, and which one the reader is in.
 */

const RANK = { id: 'rank', label: 'Rank candidates' };
const ANALYSIS = { id: 'analysis', label: 'AI analysis' };
const UPLOAD = { id: 'upload', label: 'Upload' };
const CANDIDATES = { id: 'candidates', label: 'Manage candidates' };
const COMPARE = { id: 'compare', label: 'Comparison' };

/**
 * @param {{ library: boolean, rankFirst: boolean, showCompare: boolean }} page
 * @returns {{ id: string, label: string }[]}
 */
export function dashboardSections({ library, rankFirst, showCompare }) {
  const management = showCompare ? [CANDIDATES, COMPARE] : [CANDIDATES];
  const resumes = { id: 'resumes', label: library ? 'All resumes' : 'Recent uploads' };
  const ordered = rankFirst
    ? [RANK, ANALYSIS, UPLOAD, ...management]
    : [UPLOAD, ...management, RANK, ANALYSIS];
  return [...ordered, resumes];
}

/**
 * The section the reader is in: the last one whose top has passed the line just below the
 * sticky bars. At the very bottom of the page the last section wins, even if it is too short
 * to reach the line. Above the first section, none is active.
 *
 * @param {{ id: string, top: number }[]} sections tops relative to the viewport, in page order
 * @param {number} line the viewport y just below the sticky header and navigation
 * @param {boolean} atBottom the page is scrolled to its end
 * @returns {string | null}
 */
export function activeSection(sections, line, atBottom) {
  const present = (sections || []).filter((section) => Number.isFinite(section.top));
  if (present.length === 0) return null;
  if (atBottom) return present[present.length - 1].id;
  let active = null;
  for (const section of present) {
    if (section.top <= line + 1) active = section.id;
    else break;
  }
  return active;
}
