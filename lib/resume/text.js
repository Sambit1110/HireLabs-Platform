
/**
 * Clean extracted resume text for AI analysis,
 * candidate comparison, and skill extraction.
 *
 * Preserves section headings, bullet points,
 * and paragraph structure.
 *
 * @param {unknown} value
 * @param {number} maxLength
 * @returns {string}
 */
export function cleanResumeText(value, maxLength = 50000) {
  if (typeof value !== "string") {
    return "";
  }

  const limit =
    Number.isFinite(maxLength) && maxLength >= 0
      ? Math.floor(maxLength)
      : 50000;

  if (limit === 0) {
    return "";
  }

  let text = value;

  // Normalize Unicode characters without changing
  // meaningful technical symbols.
  text = text.normalize("NFC");

  // Remove null bytes and unsupported control
  // characters while preserving newlines and tabs.
  text = text.replace(
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
    " "
  );

  // Normalize Windows and older Mac line endings.
  text = text.replace(/\r\n?/g, "\n");

  // Convert common non-breaking spaces into
  // standard spaces.
  text = text.replace(/[\u00A0\u2007\u202F]/g, " ");

  // Remove zero-width formatting characters
  // commonly introduced during PDF extraction.
  text = text.replace(
    /[\u200B-\u200D\uFEFF]/g,
    ""
  );

  // Normalize horizontal whitespace while
  // preserving line boundaries.
  text = text.replace(/[^\S\n]+/g, " ");

  // Remove whitespace at the start and end
  // of individual lines.
  text = text
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  // Preserve resume sections, but avoid
  // excessive empty lines.
  text = text.replace(/\n{3,}/g, "\n\n");

  // Normalize common PDF bullet characters
  // for more consistent AI processing.
  text = text.replace(
    /^[•●▪◦]\s*/gm,
    "- "
  );

  // Remove excessive repeated spaces.
  text = text.replace(/ {2,}/g, " ");

  text = text.trim();

  // Respect the configured output limit.
  if (text.length > limit) {
    text = text.slice(0, limit);

    // Avoid ending on a partial word when possible.
    const lastBoundary = Math.max(
      text.lastIndexOf(" "),
      text.lastIndexOf("\n")
    );

    if (lastBoundary > limit * 0.9) {
      text = text.slice(0, lastBoundary);
    }

    text = text.trimEnd();
  }

  return text;
}
