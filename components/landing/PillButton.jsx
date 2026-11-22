/**
 * Rounded pill button used across the landing page.
 * Variants: "primary" (solid white) and "ghost" (outlined).
 * `arrow` adds a decorative → that nudges forward on hover.
 * Renders an <a> when `href` is given, otherwise a <button>.
 */
export function PillButton({
  href,
  onClick,
  children,
  variant = 'primary',
  arrow = false,
  type = 'button',
  className = '',
  ...rest
}) {
  const classes = `lp-pill lp-pill--${variant === 'ghost' ? 'ghost' : 'primary'} ${className}`.trim();
  const content = (
    <>
      {children}
      {arrow ? (
        <span className="lp-pill__arrow" aria-hidden="true">
          →
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} {...rest}>
      {content}
    </button>
  );
}
