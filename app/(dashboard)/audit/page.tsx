import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  gift_pro: "Gifted Pro",
  end_trial: "Ended trial",
  edit_user: "Edited user",
  send_password_reset: "Sent password reset",
  set_temp_password: "Set temp password",
  delete_user: "Deleted user",
  set_contributor_password: "Changed contributor password",
  create_devotion: "Created devotion",
  edit_devotion: "Edited devotion",
  delete_devotions: "Deleted devotions",
  delete_all_drafts: "Deleted all drafts",
  update_feedback_status: "Updated feedback",
  delete_feedback: "Deleted feedback",
  edit_ai_models: "Changed AI models",
  edit_site_content: "Edited site content",
  send_push: "Sent push",
  schedule_push: "Scheduled push",
  cancel_scheduled_push: "Canceled scheduled push",
};

const ACTION_COLORS: Record<string, string> = {
  delete_user: "bg-red-100 text-red-700",
  set_temp_password: "bg-amber-100 text-amber-700",
  gift_pro: "bg-green-100 text-green-700",
};

export default async function AuditPage() {
  const admin = createAdminClient();
  const supabase = admin ?? createClient();
  const { data } = await supabase
    .from("admin_audit_log")
    .select("id, actor_email, action, target_type, target_id, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  const rows = data ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-tone">Audit Log</h1>
        <p className="text-tone-faint text-sm mt-1">A record of sensitive admin actions</p>
      </div>

      {!admin && (
        <div className="mb-4 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          The service role key isn&apos;t configured here, so the log can&apos;t be read. Add
          <span className="font-mono"> SUPABASE_SERVICE_ROLE_KEY </span> in Vercel and redeploy.
        </div>
      )}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="text-center py-16 text-tone-faint">
            <ScrollText size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No admin actions recorded yet.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                {["When", "Admin", "Action", "Target", "Details"].map((h) => (
                  <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-tone-faint uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r: any) => (
                <tr key={r.id} className="hover:bg-page transition-colors">
                  <td className="px-5 py-4 text-sm text-tone-faint whitespace-nowrap">{format(new Date(r.created_at), "MMM d, yyyy · h:mm a")}</td>
                  <td className="px-5 py-4 text-sm text-tone-muted">{r.actor_email ?? "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ACTION_COLORS[r.action] ?? "bg-gray-100 text-gray-600"}`}>
                      {ACTION_LABELS[r.action] ?? r.action}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-tone-faint font-mono">{r.target_id ?? "—"}</td>
                  <td className="px-5 py-4 text-xs text-tone-faint">{r.detail ? JSON.stringify(r.detail) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
