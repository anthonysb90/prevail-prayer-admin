"use server";

import { recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/authz";
import { PW_KEY, sha256 } from "@/lib/contributorAuth";

/** Whether a contributor password is currently set (admin value or env fallback). */
export async function getContributorPasswordStatus(): Promise<{ set: boolean; source: "admin" | "env" | "none"; error?: string }> {
  const gate = await requireAdmin();
  if (gate.error) return { set: false, source: "none", error: gate.error };
  const { data } = await gate.admin!.from("app_settings").select("value").eq("key", PW_KEY).maybeSingle();
  if (data?.value) return { set: true, source: "admin" };
  if (process.env.DEVOTION_SUBMIT_PASSWORD) return { set: true, source: "env" };
  return { set: false, source: "none" };
}

/** Set / change the contributor page password (stored as a SHA-256 hash). */
export async function setContributorPassword(password: string): Promise<{ ok?: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (gate.error) return { error: gate.error };
  if (!password || password.length < 6) return { error: "Use at least 6 characters." };

  const value = sha256(password);
  const { error } = await gate.admin!
    .from("app_settings")
    .upsert({ key: PW_KEY, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { error: error.message };
  await recordAudit("set_contributor_password", { targetType: "setting", targetId: PW_KEY });
  return { ok: true };
}
