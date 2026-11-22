/**
 * Chunky pill button with a dark outline and an offset shadow.
 * Renders an <a> when `href` is given, otherwise a <button>.
 */
export function PillButton({
  href,
  onClick,
  children,
  variant = 'mint',
  type = 'button',
  className = '',
  ...rest
}) {
  const classes = `lp-pill lp-pill--${variant} ${className}`.trim();

  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}
