import React from 'react';

/**
 * Reusable Badge Component for HireLabs UI
 *
 * @param {Object} props
 * @param {'cyan' | 'emerald' | 'purple' | 'amber' | 'score-high' | 'score-mid' | 'pulse'} [props.variant='cyan']
 * @param {boolean} [props.hasDot=false]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export function Badge({
  variant = 'cyan',
  hasDot = false,
  className = '',
  children,
  ...props
}) {
  const safeVariant = [
    'cyan',
    'emerald',
    'purple',
    'amber',
    'score-high',
    'score-mid',
    'pulse',
  ].includes(variant)
    ? variant
    : 'cyan';

  if (safeVariant === 'pulse') {
    return (
      <>
        <style>{`
          .hl-badge-pulse {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-height: 29px;
            padding: 0 11px;
            border: 1px solid #DED7CA;
            border-radius: 999px;
            background: rgba(255,255,255,0.55);
            color: #596544;
            font-family:
              'DM Sans',
              -apple-system,
              BlinkMacSystemFont,
              'Segoe UI',
              sans-serif;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.08em;
            line-height: 1;
            text-transform: uppercase;
            backdrop-filter: blur(10px);
          }

          .hl-badge-pulse-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #6F7D55;
            box-shadow: 0 0 0 4px rgba(111,125,85,0.1);
            animation: hlBadgePulse 2.5s ease-in-out infinite;
          }

          @keyframes hlBadgePulse {
            0%,
            100% {
              transform: scale(1);
              opacity: 1;
            }

            50% {
              transform: scale(1.12);
              opacity: 0.7;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .hl-badge-pulse-dot {
              animation: none;
            }
          }
        `}</style>

        <span
          className={`hl-badge-pulse ${className}`.trim()}
          {...props}
        >
          <span className="hl-badge-pulse-dot" />
          <span>{children}</span>
        </span>
      </>
    );
  }

  const variantClass = {
    cyan: 'hl-badge hl-badge-neutral',
    emerald: 'hl-badge hl-badge-olive',
    purple: 'hl-badge hl-badge-muted',
    amber: 'hl-badge hl-badge-warm',
    'score-high': 'hl-badge-score hl-badge-score-high',
    'score-mid': 'hl-badge-score hl-badge-score-mid',
  }[safeVariant];

  return (
    <>
      <style>{`
        .hl-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 27px;
          padding: 0 9px;
          border: 1px solid #DED7CA;
          border-radius: 999px;
          background: rgba(255,255,255,0.58);
          color: #756C63;
          font-family:
            'DM Sans',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
          font-size: 8px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: 0.075em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .hl-badge-neutral {
          color: #5E6750;
          background: #F0F2EA;
          border-color: #D9DFCD;
        }

        .hl-badge-olive {
          color: #596544;
          background: #E9EEE0;
          border-color: #D5DDC7;
        }

        .hl-badge-muted {
          color: #6C665F;
          background: #F0ECE4;
          border-color: #DDD6CA;
        }

        .hl-badge-warm {
          color: #816A54;
          background: #F2ECE4;
          border-color: #E0D5C7;
        }

        .hl-badge-score {
          display: inline-flex;
          align-items: center;
          min-height: 29px;
          padding: 0 10px;
          border-radius: 999px;
          font-family:
            'DM Sans',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
          font-size: 9px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .hl-badge-score-high {
          color: #596544;
          background: #E9EEE0;
          border: 1px solid #D5DDC7;
        }

        .hl-badge-score-mid {
          color: #7B6D5D;
          background: #F0ECE4;
          border: 1px solid #DDD6CA;
        }

        .hl-badge-dot {
          width: 6px;
          height: 6px;
          flex: 0 0 6px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.7;
        }

        @media (max-width: 600px) {
          .hl-badge {
            font-size: 7px;
            padding: 0 8px;
          }

          .hl-badge-score {
            font-size: 8px;
          }
        }
      `}</style>

      <span
        className={`${variantClass} ${className}`.trim()}
        {...props}
      >
        {hasDot && (
          <span
            className="hl-badge-dot"
            aria-hidden="true"
          />
        )}

        {children}
      </span>
    </>
  );
}