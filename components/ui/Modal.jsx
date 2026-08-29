import React, { useEffect } from 'react';

/**
 * Reusable Accessible Modal Component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {string} [props.title]
 * @param {React.ReactNode} props.children
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        .hl-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;

          display: grid;
          place-items: center;

          padding: 24px;

          background: rgba(33, 28, 24, 0.48);

          backdrop-filter: blur(9px);
          -webkit-backdrop-filter: blur(9px);

          animation: hlModalFadeIn 180ms ease-out;
        }

        .hl-modal-container {
          --cream: #F5F1E8;
          --white: #FFFFFF;
          --espresso: #211C18;
          --espresso-soft: #665D54;
          --olive: #6F7D55;
          --border: #DED7CA;

          width: min(100%, 560px);
          max-height: min(760px, calc(100vh - 48px));

          display: flex;
          flex-direction: column;

          border: 1px solid var(--border);
          border-radius: 24px;

          background: var(--white);
          color: var(--espresso);

          box-shadow:
            0 35px 90px rgba(33, 28, 24, 0.2),
            0 10px 30px rgba(33, 28, 24, 0.08);

          overflow: hidden;

          animation: hlModalUp 260ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .hl-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;

          min-height: 68px;
          padding: 0 20px 0 24px;

          border-bottom: 1px solid #E8E2D7;

          background:
            linear-gradient(
              180deg,
              #FFFFFF 0%,
              #FCFAF6 100%
            );
        }

        .hl-modal-title {
          min-width: 0;

          color: var(--espresso);

          font-family:
            'DM Sans',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;

          font-size: 12px;
          line-height: 1.4;
          font-weight: 800;

          letter-spacing: -0.01em;
        }

        .hl-modal-close {
          width: 34px;
          height: 34px;

          flex: 0 0 34px;

          display: grid;
          place-items: center;

          border: 1px solid var(--border);
          border-radius: 10px;

          background: #F8F5EF;
          color: #756C63;

          cursor: pointer;

          transition:
            background 170ms ease,
            border-color 170ms ease,
            color 170ms ease,
            transform 170ms ease;
        }

        .hl-modal-close:hover {
          background: var(--cream);
          border-color: #CEC5B8;
          color: var(--espresso);
          transform: translateY(-1px);
        }

        .hl-modal-close:active {
          transform: translateY(0);
        }

        .hl-modal-close:focus-visible {
          outline: 2px solid var(--olive);
          outline-offset: 3px;
        }

        .hl-modal-body {
          padding: 28px;

          overflow-y: auto;
          overscroll-behavior: contain;

          scrollbar-width: thin;
          scrollbar-color: #C9C1B4 transparent;
        }

        .hl-modal-body::-webkit-scrollbar {
          width: 7px;
        }

        .hl-modal-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .hl-modal-body::-webkit-scrollbar-thumb {
          background: #C9C1B4;
          border-radius: 999px;
        }

        @keyframes hlModalFadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes hlModalUp {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.985);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 620px) {
          .hl-modal-overlay {
            padding: 14px;
            align-items: end;
          }

          .hl-modal-container {
            width: 100%;
            max-height: calc(100vh - 28px);
            border-radius: 20px;
          }

          .hl-modal-header {
            min-height: 62px;
            padding-left: 18px;
          }

          .hl-modal-body {
            padding: 20px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hl-modal-overlay,
          .hl-modal-container {
            animation: none;
          }

          .hl-modal-close {
            transition: none;
          }
        }
      `}</style>

      <div
        className="hl-modal-overlay"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="hl-modal-container"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'hl-modal-title' : undefined}
        >
          <div className="hl-modal-header">
            {title ? (
              <div
                id="hl-modal-title"
                className="hl-modal-title"
              >
                {title}
              </div>
            ) : (
              <span />
            )}

            <button
              type="button"
              className="hl-modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="hl-modal-body">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}