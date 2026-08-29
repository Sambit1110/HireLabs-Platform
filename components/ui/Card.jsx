import React from 'react';

/**
 * Reusable HireLabs Card Component
 *
 * Clean, minimal surface using the Cream / Espresso / Olive
 * design system.
 *
 * @param {Object} props
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export function Card({
  className = '',
  children,
  ...props
}) {
  return (
    <>
      <style>{`
        .hl-card {
          --cream: #F5F1E8;
          --white: #FFFFFF;
          --espresso: #211C18;
          --espresso-soft: #665D54;
          --olive: #6F7D55;
          --olive-dark: #596544;
          --border: #DED7CA;

          position: relative;

          width: 100%;

          border: 1px solid var(--border);
          border-radius: 22px;

          background: var(--white);
          color: var(--espresso);

          box-shadow:
            0 14px 35px rgba(33, 28, 24, 0.055);

          overflow: hidden;

          transition:
            transform 220ms ease,
            box-shadow 220ms ease,
            border-color 220ms ease;
        }

        .hl-card:hover {
          transform: translateY(-2px);

          border-color: #D4CCBE;

          box-shadow:
            0 20px 45px rgba(33, 28, 24, 0.075);
        }

        @media (prefers-reduced-motion: reduce) {
          .hl-card {
            transition: none;
          }
        }
      `}</style>

      <div
        className={`hl-card ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    </>
  );
}


/**
 * Backwards-compatible Feature Card Component.
 *
 * The new landing page uses its own editorial feature cards,
 * but this component remains available for other parts of the app.
 */
export function FeatureCard({
  icon,
  title,
  description,
  tags = [],
  className = '',
  ...props
}) {
  return (
    <>
      <style>{`
        .hl-legacy-feature-card {
          --white: #FFFFFF;
          --espresso: #211C18;
          --espresso-soft: #675E55;
          --olive: #6F7D55;
          --olive-dark: #596544;
          --border: #DED7CA;

          position: relative;

          min-height: 300px;
          padding: 26px;

          border: 1px solid var(--border);
          border-radius: 21px;

          background: rgba(255,255,255,0.68);

          box-shadow:
            0 10px 28px rgba(33,28,24,0.04);

          overflow: hidden;

          transition:
            transform 220ms ease,
            box-shadow 220ms ease,
            border-color 220ms ease,
            background 220ms ease;
        }

        .hl-legacy-feature-card:hover {
          transform: translateY(-3px);

          background: var(--white);

          border-color: #D2C9BA;

          box-shadow:
            0 18px 42px rgba(33,28,24,0.07);
        }

        .hl-legacy-feature-icon {
          width: 43px;
          height: 43px;

          display: grid;
          place-items: center;

          margin-bottom: 22px;

          border-radius: 13px;

          background: var(--espresso);
          color: #F5F1E8;

          box-shadow:
            0 7px 18px rgba(33,28,24,0.1);
        }

        .hl-legacy-feature-title {
          margin: 0;

          color: var(--espresso);

          font-family:
            Georgia,
            'Times New Roman',
            serif;

          font-size: 24px;
          line-height: 1.02;

          letter-spacing: -0.035em;
          font-weight: 500;
        }

        .hl-legacy-feature-description {
          margin: 14px 0 0;

          color: var(--espresso-soft);

          font-size: 11px;
          line-height: 1.7;
        }

        .hl-legacy-feature-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;

          margin-top: 20px;
        }

        .hl-legacy-feature-tag {
          display: inline-flex;
          align-items: center;

          min-height: 25px;

          padding: 0 9px;

          border: 1px solid var(--border);
          border-radius: 999px;

          background: #F7F4ED;

          color: var(--olive-dark);

          font-size: 8px;
          line-height: 1;

          font-weight: 800;

          letter-spacing: 0.02em;
        }

        @media (max-width: 600px) {
          .hl-legacy-feature-card {
            min-height: 0;
            padding: 21px;
          }

          .hl-legacy-feature-title {
            font-size: 22px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hl-legacy-feature-card {
            transition: none;
          }
        }
      `}</style>

      <div
        className={`hl-legacy-feature-card ${className}`.trim()}
        {...props}
      >
        {icon && (
          <div className="hl-legacy-feature-icon">
            {icon}
          </div>
        )}

        <h3 className="hl-legacy-feature-title">
          {title}
        </h3>

        <p className="hl-legacy-feature-description">
          {description}
        </p>

        {tags.length > 0 && (
          <div className="hl-legacy-feature-tags">
            {tags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="hl-legacy-feature-tag"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}