"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";
import { loadAudience, segmentCounts, segmentTokens, sendExpoPush, SEGMENTS, type NotifData } from "@/lib/notify";

async function requireAdmin() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { error: "Not signed in." as string };
  const { data: me } = await supabase.from("profiles").select("is_admin, admin_role").eq("id", auth.user.id).single();
  if (!me?.is_admin || me.admin_role === "editor") return { error: "Admins only." as string };
  const admin = createAdminClient();
  if (!admin) return { error: "Service role key not configured." as string };
  return { admin, actorId: auth.user.id };
}

/** Initial data for the notifications page: segment counts, history, scheduled. */
export async function getNotifData(): Promise<NotifData> {
  const gate = await requireAdmin();
  if (gate.error) return { counts: {}, history: [], scheduled: [], error: gate.error };
  const admin = gate.admin!;

  const aud = await loadAudience(admin);
  const counts = segmentCounts(aud);

  const [{ data: history }, { data: scheduled }] = await Promise.all([
    admin.from("notification_log").select("id, title, body, segment, sent_count, created_at").order("created_at", { ascending: false }).limit(30),
    admin.from("scheduled_notifications").select("id, title, body, segment, send_at").eq("status", "pending").order("send_at", { ascending: true }),
  ]);

  return { counts, history: history ?? [], scheduled: scheduled ?? [] };
}

function validate(title: string, body: string, segment: string): string | null {
  if (!title.trim() || !body.trim()) return "Title and message are required.";
  if (!SEGMENTS.some((s) => s.value === segment)) return "Unknown segment.";
  return null;
}

/** Send a push to a segment now. */
export async function sendToSegment(title: string, body: string, type: string, segment: string): Promise<{ sent?: number; error?: string }> {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;
  const v = validate(title, body, segment);
  if (v) return { error: v };

  const aud = await loadAudience(admin);
  const tokens = segmentTokens(aud, segment);
  const sent = await sendExpoPush(tokens, title.trim(), body.trim(), type);

  await admin.from("notification_log").insert({ title: title.trim(), body: body.trim(), segment, sent_count: sent, sent_by: gate.actorId });
  // Keep the legacy announcements feed populated too.
  await admin.from("announcements").insert({ title: title.trim(), body: body.trim(), type, sent_at: new Date().toISOString() }).then(() => {}, () => {});
  await recordAudit("send_push", { detail: { segment, sent } });

  return { sent };
}

/** Schedule a push to a segment for later (sent by the scheduled-notifications cron). */
export async function scheduleToSegment(title: string, body: string, type: string, segment: string, sendAtISO: string): Promise<{ ok?: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  const admin = gate.admin!;
  const v = validate(title, body, segment);
  if (v) return { error: v };
  const when = new Date(sendAtISO);
  if (isNaN(when.getTime())) return { error: "Pick a valid date and time." };
  if (when.getTime() < Date.now() + 60000) return { error: "Choose a time at least a minute from now." };

  const { error } = await admin.from("scheduled_notifications").insert({
    title: title.trim(), body: body.trim(), segment, send_at: when.toISOString(), status: "pending", created_by: gate.actorId,
  });
  if (error) return { error: error.message };
  await recordAudit("schedule_push", { detail: { segment, send_at: when.toISOString() } });
  return { ok: true };
}

/** Cancel a pending scheduled push. */
export async function cancelScheduled(id: string): Promise<{ ok?: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  const { error } = await gate.admin!.from("scheduled_notifications").update({ status: "canceled" }).eq("id", id).eq("status", "pending");
  if (error) return { error: error.message };
  await recordAudit("cancel_scheduled_push", { targetType: "scheduled_notification", targetId: id });
  return { ok: true };
}
