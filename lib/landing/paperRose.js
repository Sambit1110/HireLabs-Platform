/**
 * Paper roses for the landing hero, drawn entirely in code.
 *
 * Each rose is built the way a real one grows: five large guard petals with
 * rolled-back tips, a second ring between them, a cup of smaller petals, then
 * a spiral of wide wrapped petals (golden-angle spacing) rising into a cone,
 * topped by a tightly curled bud. Petals are cream paper printed with faint
 * lines, like resume pages.
 *
 * `buildBouquetSvg()` renders the whole bouquet as a standalone SVG. The
 * committed public/landing/paper-bouquet.svg is generated from it by
 * scripts/landing/build-paper-bouquet.mjs (a test keeps them in sync).
 */

export const GOLDEN = 137.508;

const n = (value) => {
  const fixed = Number(value).toFixed(2);
  return fixed === '-0.00' ? '0' : fixed.replace(/\.?0+$/, '');
};

/** Small seeded random generator, so each rose varies but never changes between builds. */
export function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Broad, cupped outer petal with a softly pointed tip where its edge rolls back. */
export function outerPetalPath(w, h) {
  return (
    `M 0 0 C ${n(-w)} ${n(-h * 0.08)} ${n(-w * 1.12)} ${n(-h * 0.72)} ${n(-w * 0.58)} ${n(-h * 0.94)}` +
    ` Q ${n(-w * 0.22)} ${n(-h * 1.04)} 0 ${n(-h * 1.12)} Q ${n(w * 0.22)} ${n(-h * 1.04)} ${n(w * 0.58)} ${n(-h * 0.94)}` +
    ` C ${n(w * 1.12)} ${n(-h * 0.72)} ${n(w)} ${n(-h * 0.08)} 0 0 Z`
  );
}

/** The rolled-back edge of an outer petal: a light band along the top. */
export function rollPath(w, h) {
  return (
    `M ${n(-w * 0.66)} ${n(-h * 0.9)} Q ${n(-w * 0.22)} ${n(-h)} 0 ${n(-h * 1.1)} Q ${n(w * 0.22)} ${n(-h)} ${n(w * 0.66)} ${n(-h * 0.9)}` +
    ` Q ${n(w * 0.2)} ${n(-h * 0.9)} 0 ${n(-h * 0.96)} Q ${n(-w * 0.2)} ${n(-h * 0.9)} ${n(-w * 0.66)} ${n(-h * 0.9)} Z`
  );
}

/** The thin shadow just under the rolled edge. */
export function rollShadowPath(w, h) {
  return `M ${n(-w * 0.6)} ${n(-h * 0.885)} Q 0 ${n(-h * 0.93)} ${n(w * 0.6)} ${n(-h * 0.885)}`;
}

/** Short, very wide inner petal that wraps around the cone like a sheet of paper. */
export function wrapPetalPath(w, h) {
  return `M 0 0 C ${n(-w)} ${n(-h * 0.2)} ${n(-w)} ${n(-h * 0.9)} 0 ${n(-h)} C ${n(w)} ${n(-h * 0.9)} ${n(w)} ${n(-h * 0.2)} 0 0 Z`;
}

/** How much to darken a petal pointing at `theta` degrees (light from the upper left). */
export function shadeFor(theta) {
  return (0.34 * (1 - Math.cos(((theta - 315) * Math.PI) / 180))) / 2;
}

/**
 * Every petal of one rose, in drawing order (outside in).
 * @param {number} seed
 * @returns {Array<{ theta: number, reach: number, lift: number, w: number, h: number,
 *   shape: 'outer' | 'wrap', tone: 'pIn' | 'pMid' | 'pOut', roll: boolean }>}
 */
export function rosePetals(seed) {
  const rand = rng(seed * 7919);
  const jitter = (amount) => (rand() - 0.5) * 2 * amount;
  const start = rand() * 360;
  const petals = [];

  // Five guard petals, open, with gaps between them.
  for (let i = 0; i < 5; i += 1) {
    const h = 96 + jitter(8);
    petals.push({ theta: start + i * 72 + jitter(7), reach: 16, lift: 0, w: h * 0.62, h, shape: 'outer', tone: 'pOut', roll: true });
  }
  // A second ring, between the first.
  for (let i = 0; i < 5; i += 1) {
    const h = 80 + jitter(6);
    petals.push({ theta: start + 36 + i * 72 + jitter(6), reach: 12, lift: 4, w: h * 0.6, h, shape: 'outer', tone: 'pOut', roll: true });
  }
  // The cup: petals curving up around the centre.
  for (let i = 0; i < 6; i += 1) {
    const h = 60 + jitter(5);
    petals.push({ theta: start + 18 + i * 60 + jitter(8), reach: 7, lift: 9, w: h * 0.66, h, shape: 'outer', tone: 'pMid', roll: true });
  }
  // The spiral: wide, wrapped petals rising into a cone (largest first).
  const SPIRAL = 16;
  for (let i = SPIRAL - 1; i >= 0; i -= 1) {
    const u = i / (SPIRAL - 1);
    const h = 16 + 30 * u;
    petals.push({
      theta: start + i * GOLDEN,
      reach: 1 + 4 * u,
      lift: 22 - 10 * u,
      w: h * (1.5 - 0.3 * u),
      h,
      shape: 'wrap',
      tone: u > 0.5 ? 'pMid' : 'pIn',
      roll: false,
    });
  }
  return petals.map((petal) => ({ ...petal, start }));
}

function petalSvg(petal) {
  const shape = petal.shape === 'outer' ? outerPetalPath : wrapPetalPath;
  const d = shape(petal.w, petal.h);
  const parts = [
    `<path d="${shape(petal.w * 1.03, petal.h * 1.03)}" fill="rgba(40,8,6,.32)" transform="translate(0 6)"/>`,
    `<path d="${d}" fill="url(#${petal.tone})" stroke="rgba(110,90,72,.5)" stroke-width=".7"/>`,
    `<path d="${d}" fill="url(#lines)"/>`,
    `<path d="${d}" fill="#3a1410" opacity="${n(shadeFor(petal.theta))}"/>`,
  ];
  if (petal.roll) {
    parts.push(`<path d="${rollShadowPath(petal.w, petal.h)}" stroke="rgba(70,40,25,.45)" stroke-width="1.4" fill="none"/>`);
    parts.push(`<path d="${rollPath(petal.w, petal.h)}" fill="#fffaf2" opacity=".9"/>`);
  }
  return `<g transform="translate(0 ${n(-petal.lift)}) rotate(${n(petal.theta)}) translate(0 ${n(-petal.reach)})">${parts.join('')}</g>`;
}

function roseSvg({ x, y, s, r, seed, tilt = 0.78 }) {
  const petals = rosePetals(seed);
  const start = petals[0].start;
  const bud = [];
  for (let k = 0; k < 6; k += 1) {
    const radius = 15 - k * 2.3;
    bud.push(
      `<path d="M ${n(-radius)} 0 A ${n(radius)} ${n(radius)} 0 0 1 ${n(radius)} 0 A ${n(radius * 0.85)} ${n(radius * 0.5)} 0 0 0 ${n(-radius)} 0 Z"` +
        ` fill="${k % 2 ? '#cfc2ae' : '#f3ebde'}" stroke="rgba(100,80,62,.6)" stroke-width=".8" transform="rotate(${n(start + k * 128)})"/>`
    );
  }
  return (
    `<g class="rose" transform="translate(${n(x)} ${n(y)}) rotate(${n(r)}) scale(${n(s)} ${n(s * tilt)})">` +
    petals.map(petalSvg).join('') +
    `<g transform="translate(0 -22)">${bud.join('')}</g></g>`
  );
}

function stemSvg(d) {
  return (
    `<path d="${d}" stroke="rgba(40,8,6,.35)" stroke-width="10" fill="none" stroke-linecap="round" transform="translate(3 4)"/>` +
    `<path d="${d}" stroke="url(#stem)" stroke-width="7" fill="none" stroke-linecap="round"/>`
  );
}

function leafSvg({ x, y, r, s }) {
  const d = 'M 0 0 C 30 -22 78 -26 120 0 C 78 24 30 22 0 0 Z';
  return (
    `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(r)}) scale(${n(s)})">` +
    `<path d="${d}" fill="rgba(40,8,6,.3)" transform="translate(3 5)"/>` +
    `<path d="${d}" fill="url(#pMid)" stroke="rgba(120,100,80,.5)" stroke-width=".8"/>` +
    `<path d="${d}" fill="url(#lines)"/>` +
    `<path d="M 4 0 C 40 -3 80 -2 116 0" stroke="rgba(110,90,70,.55)" stroke-width="1.2" fill="none"/></g>`
  );
}

/**
 * The hero bouquet. Roses at x < ~610 sit behind the glass wall (seen bent
 * through it); one crosses the glass edge; the rest fill the right side.
 */
export const BOUQUET = {
  width: 1180,
  height: 700,
  stems: [
    'M 870 420 C 880 560 870 650 860 740',
    'M 1060 480 C 1040 600 1010 680 990 740',
    'M 700 470 C 730 590 760 680 780 740',
  ],
  leaves: [
    { x: 868, y: 640, r: -150, s: 1.1 },
    { x: 1000, y: 660, r: -25, s: 1 },
  ],
  roses: [
    { x: 250, y: 20, s: 1.55, r: 20, seed: 3 },
    { x: 300, y: 720, s: 1.65, r: -12, seed: 5 },
    { x: 1150, y: 110, s: 1.6, r: 25, seed: 8 },
    { x: 640, y: 120, s: 1.45, r: 35, seed: 11, tilt: 0.84 },
    { x: 1110, y: 480, s: 1.75, r: -20, seed: 13 },
    { x: 880, y: 170, s: 1.9, r: -8, seed: 17 },
    { x: 790, y: 540, s: 2.1, r: 6, seed: 19, tilt: 0.74 },
  ],
};

const DEFS =
  '<defs>' +
  '<linearGradient id="pIn" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#7d6a58"/><stop offset=".5" stop-color="#cbbfad"/><stop offset="1" stop-color="#ece3d5"/></linearGradient>' +
  '<linearGradient id="pMid" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#9c8b77"/><stop offset=".5" stop-color="#e2d8c9"/><stop offset="1" stop-color="#f8f2e8"/></linearGradient>' +
  '<linearGradient id="pOut" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#b3a490"/><stop offset=".45" stop-color="#ece4d7"/><stop offset="1" stop-color="#fffbf5"/></linearGradient>' +
  '<linearGradient id="stem" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b9ab96"/><stop offset=".5" stop-color="#e8dfd1"/><stop offset="1" stop-color="#b9ab96"/></linearGradient>' +
  '<pattern id="lines" width="46" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-6)">' +
  '<line x1="0" y1="4" x2="46" y2="4" stroke="#3a2a20" stroke-opacity=".16" stroke-width="1" stroke-dasharray="11 3 6 3 15 3 5 0"/></pattern>' +
  '</defs>';

/** The whole bouquet as a standalone SVG document (transparent background). */
export function buildBouquetSvg() {
  const { width, height, stems, leaves, roses } = BOUQUET;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<!-- Generated by scripts/landing/build-paper-bouquet.mjs from lib/landing/paperRose.js. Do not edit by hand. -->` +
    DEFS +
    stems.map(stemSvg).join('') +
    leaves.map(leafSvg).join('') +
    roses.map(roseSvg).join('') +
    '</svg>\n'
  );
}
