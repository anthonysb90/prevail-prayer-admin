"use server";

import { recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import { revalidatePath } from "next/cache";

const STATUSES = ["new", "planned", "in_progress", "done", "dismissed"] as const;
type FeedbackStatus = (typeof STATUSES)[number];

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

export async function deleteFeedback(id: string): Promise<{ error?: string }> {
  if (!id) return { error: "Missing id." };
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };

  const { error } = await gate.admin!.from("app_feedback").delete().eq("id", id);
  if (error) return { error: error.message };
  await recordAudit("delete_feedback", { targetType: "app_feedback", targetId: id });
  revalidatePath("/feedback");
  return {};
}
