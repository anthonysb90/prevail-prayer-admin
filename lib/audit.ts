import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface AuditOpts {
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
}

/**
 * Record a sensitive admin action to admin_audit_log. Best-effort: never throws,
 * so it can't break the action it's logging. Captures the signed-in actor.
 * NOTE: never put secrets (passwords) in `detail`.
 */
export async function recordAudit(action: string, opts: AuditOpts = {}): Promise<void> {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const admin = createAdminClient();
    if (!admin) return;
    await admin.from("admin_audit_log").insert({
      actor_id: auth?.user?.id ?? null,
      actor_email: auth?.user?.email ?? null,
      action,
      target_type: opts.targetType ?? null,
      target_id: opts.targetId ?? null,
      detail: opts.detail ?? null,
    });
  } catch {
    // swallow — auditing must never break the underlying action
  }
}
