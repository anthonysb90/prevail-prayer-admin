"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";
import { ageFromBirthday } from "@/lib/age";
import { revalidatePath } from "next/cache";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// A far-future expiry stands in for a lifetime gift, so the app's single
// "comp_until > now" check covers month, year, and lifetime uniformly.
// (Not exported: a "use server" module may only export async functions.)
const LIFETIME_COMP = "2999-12-31T00:00:00.000Z";

type GiftPlan = "trial" | "month" | "year" | "lifetime" | "revoke";

/** Confirm the caller is a signed-in admin; returns the service-role client or an error. */
async function requireAdmin() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { error: "Not signed in." as string };
  const { data: me } = await supabase.from("profiles").select("is_admin, admin_role").eq("id", auth.user.id).single();
  if (!me?.is_admin || me.admin_role === "editor") return { error: "Admins only." as string };
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
  if (plan === "trial") comp_until = new Date(Date.now() + 14 * 86400000).toISOString();
  else if (plan === "month") comp_until = new Date(Date.now() + 30 * 86400000).toISOString();
  else if (plan === "year") comp_until = new Date(Date.now() + 365 * 86400000).toISOString();
  else if (plan === "lifetime") comp_until = LIFETIME_COMP;
  else comp_until = null; // revoke

  const { error } = await admin.from("profiles").update({ comp_until }).eq("id", userId);
  if (error) return { error: error.message };
  await recordAudit("gift_pro", { targetType: "user", targetId: userId, detail: { plan } });
  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
  return {};
}

/**
 * End a user's access now: clears any app-granted comp and marks the profile
 * "expired". Note: an active App Store / RevenueCat trial or subscription is
 * controlled by Apple/Google and can't be force-cancelled from here — this ends
 * app-granted access and flips the in-app status flag.
 */
export async function endTrial(userId: string): Promise<{ error?: string }> {
  if (!userId) return { error: "Missing user." };
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;

  const { error } = await admin
    .from("profiles")
    .update({ comp_until: null, subscription_status: "expired" })
    .eq("id", userId);
  if (error) return { error: error.message };
  await recordAudit("end_trial", { targetType: "user", targetId: userId });
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
  await recordAudit("edit_user", { targetType: "user", targetId: userId });
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
  await recordAudit("send_password_reset", { targetType: "user", targetId: userId });
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
  await recordAudit("set_temp_password", { targetType: "user", targetId: userId });
  return { ok: true };
}

/** Grant/revoke admin-panel access. 'admin' = full, 'editor' = content only, 'none' = no access. */
export async function setUserRole(userId: string, role: "admin" | "editor" | "none"): Promise<{ error?: string }> {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;
  const update = role === "none" ? { is_admin: false, admin_role: null } : { is_admin: true, admin_role: role };
  const { error } = await admin.from("profiles").update(update).eq("id", userId);
  if (error) return { error: error.message };
  await recordAudit("set_user_role", { targetType: "user", targetId: userId, detail: { role } });
  revalidatePath(`/users/${userId}`);
  revalidatePath("/users");
  return {};
}

/** Export all matching users to a CSV string (respects the search query). */
export async function exportUsersCsv(q: string): Promise<{ csv?: string; error?: string }> {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;

  let query = admin
    .from("profiles")
    .select("id, display_name, phone, birthday, subscription_status, comp_until, prayer_streak, last_active_at, last_prayer_date, created_at")
    .order("created_at", { ascending: false })
    .limit(100000);

  const safeQ = (q ?? "").replace(/[,()*:\\%]/g, "").slice(0, 80);
  if (safeQ) query = query.or(`display_name.ilike.%${safeQ}%,phone.ilike.%${safeQ}%`);

  const { data, error } = await query;
  if (error) return { error: error.message };

  const header = ["Name", "Phone", "Age", "Birthday", "Subscription", "Pro gift until", "Streak (days)", "Last active", "Joined", "User ID"];
  const lines = [header.join(",")];
  for (const u of data ?? []) {
    const lastActive = (u as any).last_active_at ?? (u as any).last_prayer_date ?? "";
    lines.push([
      csvCell(u.display_name),
      csvCell(u.phone),
      csvCell(ageFromBirthday(u.birthday as string) ?? ""),
      csvCell(u.birthday),
      csvCell(u.subscription_status ?? "free"),
      csvCell(u.comp_until),
      csvCell(u.prayer_streak ?? 0),
      csvCell(lastActive),
      csvCell(u.created_at),
      csvCell(u.id),
    ].join(","));
  }

  await recordAudit("export_users", { detail: { count: (data ?? []).length, query: safeQ || null } });
  return { csv: lines.join("\n") };
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
  await recordAudit("delete_user", { targetType: "user", targetId: userId });
  revalidatePath("/users");
  return { ok: true };
}
