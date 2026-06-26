import { createClient as createSbClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for admin-only reads (bypasses RLS so the panel can see
 * every user). Returns null if SUPABASE_SERVICE_ROLE_KEY is not set yet, so
 * callers can fall back to the regular (RLS-scoped) client without crashing.
 *
 * Set SUPABASE_SERVICE_ROLE_KEY in Vercel (mark Sensitive), then redeploy.
 */
export function createAdminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createSbClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
