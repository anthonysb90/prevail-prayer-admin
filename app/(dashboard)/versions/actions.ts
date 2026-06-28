"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";
import { sendExpoPush } from "@/lib/notify";

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

/** Push an update nudge to every device whose app_version isn't `latest`. */
export async function notifyOutdated(latest: string, title: string, body: string): Promise<{ sent?: number; error?: string }> {
  if (!latest.trim()) return { error: "Enter the latest version." };
  if (!title.trim() || !body.trim()) return { error: "Enter a title and message." };
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };

  const { data } = await gate.admin!.from("user_push_tokens").select("expo_push_token, app_version");
  const tokens = (data ?? [])
    .filter((t: { expo_push_token: string | null; app_version: string | null }) => t.expo_push_token && (t.app_version ?? "") !== latest.trim())
    .map((t: { expo_push_token: string }) => t.expo_push_token);
  const unique = Array.from(new Set(tokens));

  const sent = await sendExpoPush(unique, title.trim(), body.trim(), "app_update");
  await recordAudit("notify_outdated", { detail: { latest: latest.trim(), sent } });
  return { sent };
}
