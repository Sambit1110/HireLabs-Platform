import React from 'react';

/**
 * Reusable Glass Card Component
 * 
 * @param {Object} props
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export function Card({ className = '', children, ...props }) {
  return (
    <div className={`card-glass ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Feature Card Component with Icon, Title, and Description
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
    <div className={`feature-card ${className}`} {...props}>
      {icon && <div className="feature-icon">{icon}</div>}
      <h3 className="feature-title">{title}</h3>
      <p className="feature-desc">{description}</p>
      {tags.length > 0 && (
        <div className="feature-pill-list">
          {tags.map((tag, idx) => (
            <span key={idx} className="badge badge-cyan">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
