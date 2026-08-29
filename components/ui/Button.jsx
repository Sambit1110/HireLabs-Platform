import React from 'react';

/**
 * Reusable Button Component for HireLabs UI
 *
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success'} [props.variant='primary']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {boolean} [props.isLoading=false]
 * @param {React.ReactNode} [props.leftIcon]
 * @param {React.ReactNode} [props.rightIcon]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  children,
  disabled,
  type = 'button',
  ...props
}) {
  const safeVariant = [
    'primary',
    'secondary',
    'ghost',
    'outline',
    'danger',
    'success',
  ].includes(variant)
    ? variant
    : 'primary';

  const safeSize = ['sm', 'md', 'lg'].includes(size) ? size : 'md';

  const classes = [
    'hl-btn',
    `hl-btn-${safeVariant}`,
    `hl-btn-${safeSize}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <style>{`
        .hl-btn {
          --btn-espresso: #211C18;
          --btn-cream: #F5F1E8;
          --btn-white: #FFFFFF;
          --btn-olive: #6F7D55;
          --btn-olive-dark: #596544;
          --btn-border: #DED7CA;
          --btn-muted: #746B62;

          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;

          border: 1px solid transparent;
          border-radius: 13px;

          font-family:
            'DM Sans',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;

          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.01em;

          min-height: 44px;
          padding: 0 17px;

          cursor: pointer;
          user-select: none;
          white-space: nowrap;

          transition:
            transform 180ms ease,
            background 180ms ease,
            border-color 180ms ease,
            color 180ms ease,
            box-shadow 180ms ease,
            opacity 180ms ease;
        }

        .hl-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          background: linear-gradient(
            180deg,
            rgba(255,255,255,0.12),
            transparent 55%
          );
          transition: opacity 180ms ease;
        }

        .hl-btn:hover::after {
          opacity: 1;
        }

        .hl-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .hl-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .hl-btn:disabled {
          cursor: not-allowed;
          opacity: 0.48;
          transform: none;
        }

        .hl-btn:focus-visible {
          outline: 2px solid var(--btn-olive);
          outline-offset: 3px;
        }

        /* -------------------------
           Sizes
           ------------------------- */

        .hl-btn-sm {
          min-height: 36px;
          padding: 0 13px;
          border-radius: 10px;
          font-size: 10px;
        }

        .hl-btn-md {
          min-height: 44px;
        }

        .hl-btn-lg {
          min-height: 54px;
          padding: 0 21px;
          border-radius: 15px;
          font-size: 12px;
        }

        /* -------------------------
           Primary
           ------------------------- */

        .hl-btn-primary {
          background: var(--btn-espresso);
          border-color: var(--btn-espresso);
          color: var(--btn-cream);

          box-shadow:
            0 10px 25px rgba(33, 28, 24, 0.14);
        }

        .hl-btn-primary:hover:not(:disabled) {
          background: var(--btn-olive-dark);
          border-color: var(--btn-olive-dark);

          box-shadow:
            0 13px 30px rgba(89, 101, 68, 0.17);
        }

        /* -------------------------
           Secondary
           ------------------------- */

        .hl-btn-secondary {
          background: rgba(255,255,255,0.62);
          border-color: var(--btn-border);
          color: var(--btn-espresso);

          box-shadow:
            0 4px 15px rgba(33, 28, 24, 0.035);
        }

        .hl-btn-secondary:hover:not(:disabled) {
          background: var(--btn-white);
          border-color: #CFC6B7;
        }

        /* -------------------------
           Ghost
           ------------------------- */

        .hl-btn-ghost {
          background: transparent;
          border-color: transparent;
          color: var(--btn-muted);
          box-shadow: none;
        }

        .hl-btn-ghost:hover:not(:disabled) {
          background: rgba(255,255,255,0.45);
          color: var(--btn-espresso);
        }

        /* -------------------------
           Outline
           ------------------------- */

        .hl-btn-outline {
          background: transparent;
          border-color: var(--btn-border);
          color: var(--btn-espresso);
        }

        .hl-btn-outline:hover:not(:disabled) {
          border-color: var(--btn-olive);
          color: var(--btn-olive-dark);
          background: rgba(111,125,85,0.05);
        }

        /* -------------------------
           Success
           ------------------------- */

        .hl-btn-success {
          background: var(--btn-olive);
          border-color: var(--btn-olive);
          color: #FFFFFF;

          box-shadow:
            0 10px 24px rgba(111,125,85,0.15);
        }

        .hl-btn-success:hover:not(:disabled) {
          background: var(--btn-olive-dark);
          border-color: var(--btn-olive-dark);
        }

        /* -------------------------
           Danger
           ------------------------- */

        .hl-btn-danger {
          background: #8E5B4A;
          border-color: #8E5B4A;
          color: #FFFFFF;

          box-shadow:
            0 8px 22px rgba(142,91,74,0.12);
        }

        .hl-btn-danger:hover:not(:disabled) {
          background: #784A3B;
          border-color: #784A3B;
        }

        /* -------------------------
           Icons
           ------------------------- */

        .hl-btn svg {
          flex: 0 0 auto;
          transition: transform 180ms ease;
        }

        .hl-btn:hover:not(:disabled) svg {
          transform: translateX(2px);
        }

        .btn-icon-left,
        .btn-icon-right {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }

        /* -------------------------
           Loading
           ------------------------- */

        .hl-btn .spinner-border {
          width: 16px;
          height: 16px;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: hlButtonSpin 700ms linear infinite;
        }

        @keyframes hlButtonSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 600px) {
          .hl-btn-lg {
            width: 100%;
            min-height: 52px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hl-btn,
          .hl-btn svg,
          .hl-btn::after {
            transition: none;
          }

          .hl-btn .spinner-border {
            animation-duration: 1.2s;
          }
        }
      `}</style>

      <button
        type={type}
        className={classes}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? (
          <span
            className="spinner-border"
            role="status"
            aria-label="Loading"
          />
        ) : (
          <>
            {leftIcon && (
              <span className="btn-icon-left">
                {leftIcon}
              </span>
            )}

            <span>{children}</span>

            {rightIcon && (
              <span className="btn-icon-right">
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    </>
  );
}