/**
 * The hero's opening scene, played once on load (CSS animations only, and
 * only when the visitor allows motion; see styles/landing.css "Intro").
 *
 * The screen starts as closed glass with soft roses behind it. A sweep of
 * light crosses it and resume pages tumble down. Among them, one resume stops
 * in mid-air, lifts towards the viewer, glows and is marked "Best match" while
 * the rest fall past and dim; then it floats away as the glass bricks over
 * the roses dissolve. Decorative, so hidden from screen readers.
 */

// 4 x 5 bricks over the roses. Delay = column + row, so they dissolve in a
// wave outward from the glass edge.
const CURTAIN_BRICKS = Array.from({ length: 20 }, (_, index) => ({
  key: index,
  delay: (index % 4) + Math.floor(index / 4),
}));

// Falling pages: across-the-screen position (%), start delay and fall time
// (s), starting tilt, size and sway.
const FALLING_PAGES = [
  { x: 8, d: 0, dur: 1.9, r: -18, s: 1, sway: 40 },
  { x: 22, d: 0.25, dur: 1.7, r: 12, s: 0.8, sway: -30 },
  { x: 36, d: 0.1, dur: 2, r: -6, s: 1.15, sway: 50 },
  { x: 48, d: 0.45, dur: 1.6, r: 24, s: 0.75, sway: -40 },
  { x: 58, d: 0.05, dur: 1.8, r: -14, s: 1.05, sway: 35 },
  { x: 68, d: 0.35, dur: 1.9, r: 8, s: 0.9, sway: -45 },
  { x: 78, d: 0.15, dur: 1.7, r: -22, s: 1.1, sway: 30 },
  { x: 88, d: 0.5, dur: 1.6, r: 16, s: 0.8, sway: -35 },
  { x: 14, d: 0.6, dur: 1.5, r: 30, s: 0.7, sway: 25 },
  { x: 42, d: 0.7, dur: 1.5, r: -28, s: 0.85, sway: -25 },
  { x: 72, d: 0.65, dur: 1.6, r: 20, s: 0.95, sway: 40 },
  { x: 94, d: 0.3, dur: 1.8, r: -10, s: 0.7, sway: -30 },
];

export function HeroIntro() {
  return (
    <div className="lp-curtain" aria-hidden="true">
      <div className="lp-curtain__bricks">
        {CURTAIN_BRICKS.map(({ key, delay }) => (
          <span key={key} className="lp-curtain__brick" style={{ '--d': delay }} />
        ))}
      </div>
      <div className="lp-curtain__sheen" />
      <div className="lp-curtain__pages">
        {FALLING_PAGES.map((page) => (
          <span
            key={page.x}
            className="lp-page"
            style={{
              '--x': page.x,
              '--d': page.d,
              '--dur': page.dur,
              '--r': `${page.r}deg`,
              '--s': page.s,
              '--sway': `${page.sway}px`,
            }}
          />
        ))}
      </div>
      <div className="lp-pick">
        <div className="lp-pick__lift">
          <div className="lp-pick__page">
            <span className="lp-pick__badge">✓ Best match</span>
          </div>
        </div>
      </div>
    </div>
  );
}
