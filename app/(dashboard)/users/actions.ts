"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// A far-future expiry stands in for a lifetime gift, so the app's single
// "comp_until > now" check covers month, year, and lifetime uniformly.
// (Not exported: a "use server" module may only export async functions.)
const LIFETIME_COMP = "2999-12-31T00:00:00.000Z";

type GiftPlan = "month" | "year" | "lifetime" | "revoke";

/**
 * Gift (or revoke) Pro access for a user by setting profiles.comp_until.
 * Admin-only: requires the caller to be a signed-in admin and uses the
 * service-role client to write.
 */
export async function setCompAccess(userId: string, plan: GiftPlan): Promise<{ error?: string }> {
  if (!userId) return { error: "Missing user." };

  // Authorize: the signed-in user must be an admin.
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { error: "Not signed in." };
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", auth.user.id).single();
  if (!me?.is_admin) return { error: "Admins only." };

  const admin = createAdminClient();
  if (!admin) return { error: "Service role key not configured." };

  let comp_until: string | null;
  if (plan === "month") comp_until = new Date(Date.now() + 30 * 86400000).toISOString();
  else if (plan === "year") comp_until = new Date(Date.now() + 365 * 86400000).toISOString();
  else if (plan === "lifetime") comp_until = LIFETIME_COMP;
  else comp_until = null; // revoke

  const { error } = await admin.from("profiles").update({ comp_until }).eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/users");
  return {};
}
