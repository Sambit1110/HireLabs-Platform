/** Share of the scroll between two words spent resting on each word. */
const HOLD = 0.25;
/** Degrees the drum turns from one word to the next. */
const STEP_DEG = 34;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Which word the drum is on for a given scroll progress, as a float index.
 * It rests on each word for a while, then eases to the next, and never
 * goes backwards as progress increases.
 *
 * @param {number} progress 0 at the top of the section, 1 at the bottom
 * @param {number} count number of words
 * @returns {number} 0 … count - 1
 */
export function wheelIndexAt(progress, count) {
  if (!Number.isInteger(count) || count <= 1 || !Number.isFinite(progress)) return 0;
  const raw = clamp(progress, 0, 1) * (count - 1);
  const base = Math.floor(raw);
  if (base >= count - 1) return count - 1;
  const t = clamp((raw - base - HOLD) / (1 - 2 * HOLD), 0, 1);
  return base + t * t * (3 - 2 * t);
}

/**
 * How a word sits on the drum, given how far it is from the current word.
 * `y` is a multiple of the drum radius; `rotateX` is in degrees; `blur` in px.
 *
 * @param {number} offset word index minus the current (float) index
 * @returns {{ y: number, rotateX: number, opacity: number, blur: number }}
 */
export function wordPose(offset) {
  const angle = clamp(offset * STEP_DEG, -90, 90);
  const distance = Math.abs(offset);
  return {
    // `|| 0` turns -0 into 0 so the resting pose is exactly upright.
    y: Math.sin((angle * Math.PI) / 180) || 0,
    rotateX: -angle || 0,
    opacity: clamp(1 - distance * 0.6, 0, 1),
    blur: Math.min(distance * 2.5, 8),
  };
}
