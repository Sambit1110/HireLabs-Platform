/**
 * Browser-safe runtime configuration (AI settings live in lib/server/aiConfig.js). Never log or return the values themselves.
 *
 * NEXT_PUBLIC_* variables are referenced literally so Next.js can inline them
 * into the browser bundle at build time (changing them requires a rebuild).
 */

/** Browser-safe Supabase settings. Publishable key preferred, legacy anon key accepted. */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  let validUrl = false;
  try {
    validUrl = /^https?:$/.test(new URL(url).protocol);
  } catch {
    validUrl = false;
  }

  return {
    url,
    key,
    keySource: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
        : null,
    configured: validUrl && Boolean(key),
  };
}

export const SUPABASE_NOT_CONFIGURED =
  'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY), then rebuild.';
