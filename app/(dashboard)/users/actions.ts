"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// A far-future expiry stands in for a lifetime gift, so the app's single
// "comp_until > now" check covers month, year, and lifetime uniformly.
// (Not exported: a "use server" module may only export async functions.)
const LIFETIME_COMP = "2999-12-31T00:00:00.000Z";

type GiftPlan = "month" | "year" | "lifetime" | "revoke";

/** Confirm the caller is a signed-in admin; returns the service-role client or an error. */
async function requireAdmin() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { error: "Not signed in." as string };
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", auth.user.id).single();
  if (!me?.is_admin) return { error: "Admins only." as string };
  const admin = createAdminClient();
  if (!admin) return { error: "Service role key not configured." as string };
  return { admin };
}

/** Gift (or revoke) Pro access by setting profiles.comp_until. */
export async function setCompAccess(userId: string, plan: GiftPlan): Promise<{ error?: string }> {
  if (!userId) return { error: "Missing user." };
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;

  let comp_until: string | null;
  if (plan === "month") comp_until = new Date(Date.now() + 30 * 86400000).toISOString();
  else if (plan === "year") comp_until = new Date(Date.now() + 365 * 86400000).toISOString();
  else if (plan === "lifetime") comp_until = LIFETIME_COMP;
  else comp_until = null; // revoke

  const { error } = await admin.from("profiles").update({ comp_until }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
  return {};
}

/** Edit a user's profile fields (name, phone, birthday). */
export async function editUser(
  userId: string,
  fields: { display_name: string; phone: string; birthday: string }
): Promise<{ error?: string }> {
  if (!userId) return { error: "Missing user." };
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;

  const birthday = fields.birthday.trim();
  if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
    return { error: "Birthday must be YYYY-MM-DD." };
  }

  const { error } = await admin
    .from("profiles")
    .update({
      display_name: fields.display_name.trim() || null,
      phone: fields.phone.trim() || null,
      birthday: birthday || null,
    })
    .eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
  return {};
}

/** Email the user a Supabase password-reset link. */
export async function sendPasswordReset(userId: string): Promise<{ error?: string; ok?: boolean }> {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;

  const { data: u } = await admin.auth.admin.getUserById(userId);
  const email = u?.user?.email;
  if (!email) return { error: "This account has no email address." };

  // Uses the project's configured Site URL / redirect for the recovery link.
  const redirectTo = process.env.NEXT_PUBLIC_RESET_REDIRECT_URL || undefined;
  const { error } = await admin.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
  if (error) return { error: error.message };
  return { ok: true };
}

/** Set a temporary password chosen by the admin. */
export async function setTempPassword(userId: string, password: string): Promise<{ error?: string; ok?: boolean }> {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;

  if (!password || password.length < 8) return { error: "Use at least 8 characters." };
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  return { ok: true };
}

/** Permanently delete a user (auth + cascaded data). Keeps the email on record. */
export async function deleteUser(userId: string): Promise<{ error?: string; ok?: boolean }> {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;

  // Preserve the email (mirrors the in-app account-deletion behavior).
  try {
    const { data: u } = await admin.auth.admin.getUserById(userId);
    const email = u?.user?.email;
    if (email) await admin.from("deleted_emails").insert({ email }).then(() => {}, () => {});
  } catch {}

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/users");
  return { ok: true };
}
