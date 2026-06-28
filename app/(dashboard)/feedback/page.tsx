import { createAdminClient } from "@/lib/supabase/admin";
import { FeedbackList, type FeedbackRow } from "./FeedbackList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FeedbackPage() {
  const admin = createAdminClient();
  let rows: FeedbackRow[] = [];
  let configured = true;

  if (!admin) {
    configured = false;
  } else {
    const { data } = await admin
      .from("app_feedback")
      .select("id, type, message, email, display_name, app_version, platform, status, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    rows = (data as FeedbackRow[]) ?? [];
  }

  const openCount = rows.filter((r) => r.status === "new").length;

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-tone">Feedback</h1>
        <p className="text-sm text-tone-muted mt-1">
          Bug reports and feature ideas submitted from the app{openCount ? ` — ${openCount} new` : ""}.
        </p>
      </div>

      {!configured ? (
        <div className="rounded-card border border-line bg-white p-6 text-sm text-tone-muted">
          Service role key isn&apos;t configured, so feedback can&apos;t be read. Add SUPABASE_SERVICE_ROLE_KEY to the admin
          environment.
        </div>
      ) : (
        <FeedbackList initialRows={rows} />
      )}
    </div>
  );
}
