/**
 * Evenly spaced angles (in degrees) for words around the rotating wheel.
 *
 * @param {number} count
 * @returns {{ angle: number }[]}
 */
export function wheelPositions(count) {
  if (!Number.isInteger(count) || count <= 0) return [];
  return Array.from({ length: count }, (_, index) => ({ angle: (index * 360) / count }));
}
