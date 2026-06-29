import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { EngagementTable, type EngagementRow } from "./EngagementTable";

export const dynamic = "force-dynamic";

/** Tally rows-per-user for a table that has a `user_id` column. */
async function countByUser(admin: ReturnType<typeof createAdminClient>, table: string): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  if (!admin) return m;
  const { data } = await admin.from(table).select("user_id");
  for (const r of (data ?? []) as { user_id: string | null }[]) {
    if (r.user_id) m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1);
  }
  return m;
}

export default async function EngagementPage() {
  const admin = createAdminClient();
  const supabase = admin ?? createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, phone, subscription_status, comp_until, prayer_streak, last_active_at, last_prayer_date, created_at");

  // One query per feature table; tally per user in memory.
  const [prayers, journals, devotions, scriptures, sessions] = await Promise.all([
    countByUser(admin, "prayer_requests"),
    countByUser(admin, "journal_entries"),
    countByUser(admin, "devotion_responses"),
    countByUser(admin, "user_favorite_verses"),
    countByUser(admin, "prayer_sessions"),
  ]);

  // AI usage: prefer the import-quota table, fall back to the cost log.
  let ai = await countByUser(admin, "ai_import_usage");
  if (ai.size === 0) ai = await countByUser(admin, "ai_cost_log");

  // Push reachability.
  const pushOn = new Set<string>();
  if (admin) {
    const { data: tokens } = await admin.from("user_push_tokens").select("user_id, expo_push_token");
    for (const t of (tokens ?? []) as { user_id: string | null; expo_push_token: string | null }[]) {
      if (t.user_id && t.expo_push_token) pushOn.add(t.user_id);
    }
  }

  const now = Date.now();
  const rows: EngagementRow[] = (profiles ?? []).map((p: any) => {
    const comped = !!p.comp_until && new Date(p.comp_until).getTime() > now;
    const lastActive = p.last_active_at ?? p.last_prayer_date ?? null;
    return {
      id: p.id,
      name: p.display_name || p.phone || `${p.id.slice(0, 8)}…`,
      plan: comped ? "Pro (gift)" : p.subscription_status,
      push: pushOn.has(p.id),
      prayers: prayers.get(p.id) ?? 0,
      journals: journals.get(p.id) ?? 0,
      devotions: devotions.get(p.id) ?? 0,
      scriptures: scriptures.get(p.id) ?? 0,
      sessions: sessions.get(p.id) ?? 0,
      ai: ai.get(p.id) ?? 0,
      streak: p.prayer_streak ?? 0,
      lastActive,
      joined: p.created_at,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-tone">Member Engagement</h1>
        <p className="text-sm text-tone-muted mt-1">
          What each member actually uses — pulled live from your database. Click a column to sort.
        </p>
      </div>
      {!admin && (
        <div className="mb-4 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Add <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> in Vercel to load full engagement data.
        </div>
      )}
      <EngagementTable rows={rows} />
    </div>
  );
}
