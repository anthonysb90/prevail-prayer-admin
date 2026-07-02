import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Central authorization gates for server actions and server components.
 *
 *  - requireAdmin(): full admins only (admin_role !== "editor").
 *  - requireEditor(): content editors AND full admins. Use on the pages the
 *    sidebar/middleware allow editors into: devotions, scripture, music.
 *
 * Both re-check the signed-in user against the database rather than trusting
 * middleware, and return the service-role client so callers can read/write
 * across all users.
 */

export type Gate =
  | { error: string; admin?: undefined; actorId?: undefined; role?: undefined }
  | { error?: undefined; admin: SupabaseClient; actorId: string; role: "admin" | "editor" };

async function gate(allowEditor: boolean): Promise<Gate> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { error: "Not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin, admin_role")
    .eq("id", auth.user.id)
    .single();

  if (!me?.is_admin) return { error: "Admins only." };
  const role: "admin" | "editor" = me.admin_role === "editor" ? "editor" : "admin";
  if (!allowEditor && role === "editor") return { error: "Admins only." };

  const admin = createAdminClient();
  if (!admin) return { error: "Service role key not configured." };
  return { admin, actorId: auth.user.id, role };
}

/** Full admins only. */
export function requireAdmin(): Promise<Gate> {
  return gate(false);
}

/** Content editors and full admins (devotions, scripture, music). */
export function requireEditor(): Promise<Gate> {
  return gate(true);
}
