/**
 * Background and text colours for each landing section theme.
 * Sections declare `data-lp-theme="ink" | "slate" | "lavender"`.
 */
export const THEMES = {
  ink: { bg: '#0F0F0F', fg: '#BCBBFF' },
  slate: { bg: '#262632', fg: '#BCBBFF' },
  lavender: { bg: '#BCBBFF', fg: '#0F0F0F' },
};

/**
 * @param {string | undefined} name
 * @returns {{ bg: string, fg: string }}
 */
export function themeFor(name) {
  return Object.prototype.hasOwnProperty.call(THEMES, name) ? THEMES[name] : THEMES.ink;
}
