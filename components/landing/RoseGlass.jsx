const BOUQUET_SRC = '/landing/paper-bouquet.svg';
const BRICKS = Array.from({ length: 20 }, (_, index) => index);

/**
 * Hero background: a bouquet of paper roses. On the right they are sharp;
 * on the left the same picture is seen through a wall of glass bricks that
 * bends it (an SVG refraction filter) and softens it, with the headline on
 * top. Purely decorative, so hidden from screen readers.
 *
 * The bouquet is a static, cacheable SVG generated from lib/landing/paperRose.js.
 */
export function RoseGlass() {
  return (
    <div className="lp-roses" aria-hidden="true">
      <svg className="lp-roses__defs" width="0" height="0" focusable="false">
        <filter id="lp-glassy" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.04" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="38" xChannelSelector="R" yChannelSelector="G" result="bent" />
          <feGaussianBlur in="bent" stdDeviation="2.6" />
        </filter>
      </svg>

      {/* Plain <img>: a decorative, already-optimised SVG; next/image adds nothing here. */}
      <img className="lp-roses__glass" src={BOUQUET_SRC} alt="" decoding="async" />
      <img className="lp-roses__sharp" src={BOUQUET_SRC} alt="" decoding="async" />

      <div className="lp-glass">
        {BRICKS.map((brick) => (
          <span key={brick} className="lp-glass__brick" />
        ))}
      </div>
      <div className="lp-roses__shade" />
    </div>
  );
}
