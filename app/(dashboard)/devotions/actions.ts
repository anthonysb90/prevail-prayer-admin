"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

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

/** Permanently delete one or more devotions (and their reflection questions). */
export async function deleteDevotions(ids: string[]): Promise<{ error?: string; deleted?: number }> {
  const clean = (ids ?? []).filter(Boolean);
  if (clean.length === 0) return { error: "Nothing selected." };
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };

  await gate.admin!.from("devotion_questions").delete().in("devotion_id", clean);
  const { error } = await gate.admin!.from("devotions").delete().in("id", clean);
  if (error) return { error: error.message };

  await recordAudit("delete_devotions", { targetType: "devotions", targetId: `${clean.length} items`, detail: { count: clean.length } });
  revalidatePath("/devotions");
  return { deleted: clean.length };
}

/** Delete every draft (unpublished, unscheduled) devotion. */
export async function deleteAllDrafts(): Promise<{ error?: string; deleted?: number }> {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };

  const { data: rows } = await gate.admin!
    .from("devotions").select("id").eq("is_published", false).is("scheduled_for", null);
  const ids = (rows ?? []).map((r: { id: string }) => r.id);
  if (ids.length === 0) return { deleted: 0 };

  await gate.admin!.from("devotion_questions").delete().in("devotion_id", ids);
  const { error } = await gate.admin!.from("devotions").delete().in("id", ids);
  if (error) return { error: error.message };

  await recordAudit("delete_all_drafts", { targetType: "devotions", targetId: "drafts", detail: { count: ids.length } });
  revalidatePath("/devotions");
  return { deleted: ids.length };
}
