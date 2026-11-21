/**
 * Turn Supabase Auth errors into messages that are clear for users and do
 * not reveal whether an email address has an account.
 */

export const SIGNUP_CHECK_EMAIL_MESSAGE =
  'Check your inbox to confirm your email address. If you already have an account, sign in or reset your password instead.';

export const RESET_SENT_MESSAGE =
  'If an account exists for this email, a password reset link is on its way. Check your inbox and spam folder.';

const MESSAGES = {
  invalid_credentials: 'That email and password combination is not correct.',
  email_not_confirmed:
    'Please confirm your email address first. Check your inbox for the confirmation link.',
  over_request_rate_limit: 'Too many attempts. Please wait a minute and try again.',
  over_email_send_rate_limit:
    'Too many emails were requested. Please wait a few minutes before trying again.',
  weak_password:
    'That password is too weak. Use at least 8 characters with letters and numbers, and avoid common passwords.',
  same_password: 'Your new password must be different from your current one.',
  email_address_invalid: 'Please enter a valid email address.',
  signup_disabled: 'New sign-ups are currently turned off.',
  session_expired: 'Your session has expired. Please sign in again.',
  session_not_found: 'Your session has expired. Please sign in again.',
  refresh_token_not_found: 'Your session has expired. Please sign in again.',
  otp_expired: 'This link has expired or was already used. Please request a new one.',
  flow_state_expired: 'This link has expired. Please request a new one.',
  flow_state_not_found: 'This link is no longer valid. Please request a new one.',
  bad_code_verifier:
    'Please open the link in the same browser you requested it from, or request a new one.',
  captcha_failed: 'The security check failed. Please try again.',
};

const FALLBACKS = {
  signin: 'Unable to sign in right now. Please try again.',
  signup: 'Unable to create the account right now. Please try again.',
  reset: 'Unable to send the reset email right now. Please try again.',
  update: 'Unable to update your password right now. Please try again.',
  callback: 'This sign-in link could not be completed. Please request a new one.',
};

/**
 * @param {unknown} error A Supabase AuthError (or anything thrown).
 * @param {'signin' | 'signup' | 'reset' | 'update' | 'callback'} context
 * @returns {string}
 */
export function friendlyAuthError(error, context) {
  const code =
    error && typeof error === 'object' && typeof error.code === 'string'
      ? error.code
      : '';
  const status =
    error && typeof error === 'object' && typeof error.status === 'number'
      ? error.status
      : 0;

  // Never confirm that an account exists.
  if (context === 'signup' && (code === 'user_already_exists' || code === 'email_exists')) {
    return SIGNUP_CHECK_EMAIL_MESSAGE;
  }

  if (context === 'reset' && code === 'user_not_found') {
    return RESET_SENT_MESSAGE;
  }

  if (code && Object.prototype.hasOwnProperty.call(MESSAGES, code)) {
    return MESSAGES[code];
  }

  if (status === 429) return MESSAGES.over_request_rate_limit;

  return FALLBACKS[context] || FALLBACKS.signin;
}
