/**
 * Password rules for sign-up and password changes.
 *
 * Mirror these in Supabase (Authentication → Providers → Email): minimum
 * length 8 and "letters and digits" required, so the server enforces the
 * same rules even if someone bypasses this page.
 */

export const PASSWORD_MIN_LENGTH = 8;
// Supabase hashes passwords with bcrypt, which only uses the first 72 bytes.
export const PASSWORD_MAX_LENGTH = 72;

export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters, with letters and numbers.`;

/**
 * @param {string} password
 * @param {string} [email]
 * @returns {string | null} An error message, or null when the password is acceptable.
 */
export function validatePassword(password, email = '') {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }

  if (new TextEncoder().encode(password).length > PASSWORD_MAX_LENGTH) {
    return `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  }

  if (!/\p{L}/u.test(password) || !/\p{N}/u.test(password)) {
    return 'Include both letters and numbers.';
  }

  if (password.trim() !== password) {
    return 'Remove spaces from the start and end of the password.';
  }

  const lowered = password.toLocaleLowerCase();
  const emailName =
    typeof email === 'string' ? email.split('@')[0].toLocaleLowerCase() : '';

  if (emailName.length >= 3 && lowered.includes(emailName)) {
    return 'Do not include your email name in the password.';
  }

  return null;
}
