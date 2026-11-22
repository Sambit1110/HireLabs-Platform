import { useId } from 'react';

/**
 * Slowly rotating circular text badge (a playful sticker-style accent).
 * Decorative: the same message appears elsewhere as normal text.
 */
export function CircularBadge({ text = 'AI-ASSISTED · HUMAN-DECIDED · ', className = '' }) {
  const pathId = `lp-badge-${useId().replace(/:/g, '')}`;

  return (
    <div className={`lp-badge ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 120 120" className="lp-badge__ring">
        <defs>
          <path id={pathId} d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
        </defs>
        <circle cx="60" cy="60" r="58" className="lp-badge__disc" />
        <text className="lp-badge__text">
          <textPath href={`#${pathId}`} textLength="276" lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      <span className="lp-badge__dot" />
    </div>
  );
}
