/**
 * Slow scrolling strip of short phrases. Decorative: the same ideas are
 * stated in the page's sections, so it is hidden from screen readers.
 */
const PHRASES = ['Parse', 'Match', 'Explain', 'Stay fair', 'AI suggests, people decide', 'HireLabs'];

export function Marquee() {
  const items = [...PHRASES, ...PHRASES];
  return (
    <div className="lp-marquee" aria-hidden="true">
      <div className="lp-marquee__track">
        {[0, 1].map((copy) => (
          <span key={copy} className="lp-marquee__group">
            {items.map((phrase, index) => (
              <span key={`${copy}-${index}`} className="lp-marquee__item">
                {phrase}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
