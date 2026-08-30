import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createSupabaseClient> | null = null;

/** Creates one shared browser client for the current app. */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."
    );
  }

  if (!browserClient) {
    browserClient = createSupabaseClient(url, key);
  }

  return browserClient;
}
