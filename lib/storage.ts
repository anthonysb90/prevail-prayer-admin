import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensure a public storage bucket exists, but only attempt the create once per
 * server process. The previous code called createBucket on every single upload,
 * which was wasteful and noisy. Best-effort: a failure here (e.g. bucket already
 * exists) is swallowed, and the subsequent upload surfaces any real problem.
 */
const ensured = new Set<string>();

export async function ensurePublicBucket(admin: SupabaseClient, bucket: string): Promise<void> {
  if (ensured.has(bucket)) return;
  ensured.add(bucket);
  await admin.storage.createBucket(bucket, { public: true }).catch(() => {});
}
