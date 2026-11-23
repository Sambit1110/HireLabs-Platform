/** True when a job-description field contains a separate resume section. */
export function containsEmbeddedResume(text) {
  return /(?:^|[\r\n])\s*(?:candidate\s+)?resume(?:\s+text)?\s*:/im.test(text);
}
