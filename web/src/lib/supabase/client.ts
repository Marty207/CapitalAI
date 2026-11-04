import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-only Supabase client.
 * Uses the "anon" key — safe to expose in the frontend; Row Level Security + your
 * backend still protect sensitive bank data in Postgres.
 */
let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  browserClient = createClient(url, anonKey);
  return browserClient;
}
