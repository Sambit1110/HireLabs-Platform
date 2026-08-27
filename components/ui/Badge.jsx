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
  if (variant === 'pulse') {
    return (
      <div className={`badge-pulse ${className}`} {...props}>
        <span className="dot" />
        <span>{children}</span>
      </div>
    );
  }

  const variantClass = {
    cyan: 'badge badge-cyan',
    emerald: 'badge badge-emerald',
    purple: 'badge badge-purple',
    amber: 'badge badge-amber',
    'score-high': 'badge-score score-high',
    'score-mid': 'badge-score score-mid',
  }[variant] || 'badge badge-cyan';

  return (
    <span className={`${variantClass} ${className}`} {...props}>
      {hasDot && <span className="live-pulse" />}
      {children}
    </span>
  );
}
