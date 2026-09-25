import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_NOT_CONFIGURED, getSupabaseConfig } from "@/lib/config";

let browserClient: ReturnType<typeof createSupabaseClient> | null = null;

/** Creates one shared browser client for the current app. Throws a clear error when unconfigured. */
export function createClient() {
  const { url, key, configured } = getSupabaseConfig();

  if (!configured) {
    throw new Error(SUPABASE_NOT_CONFIGURED);
  }

  if (!browserClient) {
    browserClient = createSupabaseClient(url, key);
  }

  return browserClient;
}
