'use client';

/**
 * PREVIEW ONLY: floating switch to compare the two landing palettes.
 * Remove once a theme is chosen.
 */
export function ThemeSwitch({ palette, onChange }) {
  return (
    <div className="lp-theme-switch" role="group" aria-label="Preview theme">
      <span className="lp-theme-switch__label">Preview</span>
      {[
        ['lavender', 'Lavender'],
        ['burgundy', 'Burgundy'],
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={palette === value}
          className={palette === value ? 'is-active' : ''}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
