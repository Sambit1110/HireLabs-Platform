/**
 * Pointer handlers for interactive cards: they set CSS variables for a
 * spotlight (--mx, --my) and a gentle tilt (--rx, --ry) on the element,
 * so hovering never re-renders React. The CSS decides whether to use them
 * (mouse users who allow motion).
 */
export function onTiltMove(event) {
  if (event.pointerType !== 'mouse') return;
  const card = event.currentTarget;
  const box = card.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width;
  const y = (event.clientY - box.top) / box.height;
  card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
  card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
  card.style.setProperty('--rx', `${((0.5 - y) * 6).toFixed(2)}deg`);
  card.style.setProperty('--ry', `${((x - 0.5) * 8).toFixed(2)}deg`);
}

export function onTiltLeave(event) {
  event.currentTarget.style.setProperty('--rx', '0deg');
  event.currentTarget.style.setProperty('--ry', '0deg');
}
