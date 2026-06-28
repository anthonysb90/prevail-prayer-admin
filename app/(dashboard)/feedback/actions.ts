"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const STATUSES = ["new", "planned", "in_progress", "done", "dismissed"] as const;
type FeedbackStatus = (typeof STATUSES)[number];

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

export async function updateFeedbackStatus(id: string, status: string): Promise<{ error?: string }> {
  if (!id) return { error: "Missing id." };
  if (!STATUSES.includes(status as FeedbackStatus)) return { error: "Invalid status." };
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };

  const { error } = await gate.admin!
    .from("app_feedback")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  await recordAudit("update_feedback_status", { targetType: "app_feedback", targetId: id, detail: { status } });
  revalidatePath("/feedback");
  return {};
}
