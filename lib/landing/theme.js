/**
 * Background and text colours for each landing section theme, per palette.
 * Sections declare `data-lp-theme="ink" | "slate" | "lavender"`; the page
 * root declares `data-palette="lavender" | "burgundy"`.
 */
export const PALETTES = {
  lavender: {
    ink: { bg: '#0F0F0F', fg: '#BCBBFF' },
    slate: { bg: '#262632', fg: '#BCBBFF' },
    lavender: { bg: '#BCBBFF', fg: '#0F0F0F' },
  },
  burgundy: {
    ink: { bg: '#2A0304', fg: '#F3E9DF' },
    slate: { bg: '#4A0608', fg: '#F3E9DF' },
    lavender: { bg: '#F3E9DF', fg: '#3A0506' },
  },
};

/** The original (lavender) palette, kept as THEMES for existing callers. */
export const THEMES = PALETTES.lavender;

/**
 * @param {string | undefined} name section theme
 * @param {string} [palette] page palette
 * @returns {{ bg: string, fg: string }}
 */
export function themeFor(name, palette = 'lavender') {
  const themes = Object.prototype.hasOwnProperty.call(PALETTES, palette)
    ? PALETTES[palette]
    : PALETTES.lavender;
  return Object.prototype.hasOwnProperty.call(themes, name) ? themes[name] : themes.ink;
}

/**
 * Palette requested in the URL (`?theme=burgundy`), defaulting to lavender.
 * @param {string} search location.search
 */
export function paletteFromSearch(search) {
  const value = new URLSearchParams(search || '').get('theme');
  return Object.prototype.hasOwnProperty.call(PALETTES, value) ? value : 'lavender';
}
