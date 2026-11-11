export function cleanResumeText(value, maxLength = 50000) {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/\u0000/g, ' ').replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim().slice(0, maxLength);
}
