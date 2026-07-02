import { createHash, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Shared contributor-password logic used by both the /contribute server actions
 * and the /api/images routes (so the public image proxy can require the same
 * password the contribute page already asks for).
 *
 * NOT a "use server" module — it exports plain functions callable from route
 * handlers as well as server actions.
 */

export const PW_KEY = "devotion_submit_password_sha256";

export function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** Current contributor-password hash: the admin-set value in app_settings,
 *  falling back to the DEVOTION_SUBMIT_PASSWORD env var if no value is set. */
export async function storedPasswordHash(): Promise<string | null> {
  const admin = createAdminClient();
  if (admin) {
    const { data } = await admin.from("app_settings").select("value").eq("key", PW_KEY).maybeSingle();
    if (data?.value) return data.value as string;
  }
  const env = process.env.DEVOTION_SUBMIT_PASSWORD;
  return env ? sha256(env) : null;
}

/** Constant-time check of a plaintext password against the stored hash. */
export async function checkContributorPassword(input: string): Promise<boolean> {
  const stored = await storedPasswordHash();
  if (!stored || !input) return false;
  const a = Buffer.from(sha256(input), "hex");
  const b = Buffer.from(stored, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
