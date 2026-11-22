/**
 * Background and text colours for each landing section theme.
 * Sections declare `data-lp-theme="deep" | "mid" | "cream"`.
 */
export const THEMES = {
  deep: { bg: '#2A0304', fg: '#F3E9DF' },
  mid: { bg: '#4A0608', fg: '#F3E9DF' },
  cream: { bg: '#F3E9DF', fg: '#3A0506' },
};

/**
 * @param {string | undefined} name
 * @returns {{ bg: string, fg: string }}
 */
export function themeFor(name) {
  return Object.prototype.hasOwnProperty.call(THEMES, name) ? THEMES[name] : THEMES.deep;
}
