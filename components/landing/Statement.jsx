import { FocusText } from '@/components/landing/FocusText';

/**
 * Large statement lines that come into focus word by word.
 */
export function Statement({ lines, theme = 'mid' }) {
  return (
    <section data-lp-theme={theme} className="lp-section lp-statement">
      <div className="lp-container">
        {lines.map((line, index) => (
          <FocusText key={line} as="h2" className="lp-display lp-statement__line" text={line} delay={index * 0.2} />
        ))}
      </div>
    </section>
  );
}
