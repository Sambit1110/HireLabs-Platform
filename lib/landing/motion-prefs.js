/**
 * Whether landing animations should run, given motion's useReducedMotion()
 * value. The hook returns null until it knows the preference, so treat
 * anything other than an explicit `false` as "show the final state".
 *
 * @param {boolean | null | undefined} prefersReducedMotion
 * @returns {boolean}
 */
export function shouldAnimate(prefersReducedMotion) {
  return prefersReducedMotion === false;
}
