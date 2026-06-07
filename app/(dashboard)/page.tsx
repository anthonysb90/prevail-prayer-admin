import { createClient } from "@/lib/supabase/server";
import { Users, BookOpen, Timer, Heart } from "lucide-react";

async function getStats() {
  const supabase = createClient();
  const [users, prayers, answered, sessions, devotions] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("prayer_requests").select("id", { count: "exact", head: true }).in("status", ["active", "ongoing"]),
    supabase.from("prayer_requests").select("id", { count: "exact", head: true }).eq("status", "answered"),
    supabase.from("prayer_sessions").select("id", { count: "exact", head: true }).eq("completed", true),
    supabase.from("devotions").select("id", { count: "exact", head: true }).eq("is_published", true),
  ]);
  return {
    users: users.count ?? 0,
    activePrayers: prayers.count ?? 0,
    answeredPrayers: answered.count ?? 0,
    sessions: sessions.count ?? 0,
    devotions: devotions.count ?? 0,
  };
}

async function getRecentActivity() {
  const supabase = createClient();
  const [prayers, devotionList] = await Promise.all([
    supabase.from("prayer_requests").select("id, title, status, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("devotions").select("id, title, published_at, is_published").order("created_at", { ascending: false }).limit(5),
  ]);
  return { prayers: prayers.data ?? [], devotions: devotionList.data ?? [] };
}

const STAT_CARDS = [
  { label: "Total Members", key: "users", icon: Users },
  { label: "Active Prayers", key: "activePrayers", icon: BookOpen },
  { label: "Answered Prayers", key: "answeredPrayers", icon: Heart },
  { label: "Prayer Sessions", key: "sessions", icon: Timer },
] as const;

function statusPill(status: string) {
  if (status === "answered") return "bg-ok/15 text-ok";
  if (status === "ongoing") return "bg-brand-soft text-brand-deep";
  return "bg-brand-soft text-brand";
}

export default async function DashboardPage() {
  const [stats, activity] = await Promise.all([getStats(), getRecentActivity()]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-tone">Overview</h1>
        <p className="text-tone-faint text-sm mt-1">A look at Prevail Prayer activity</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {STAT_CARDS.map(({ label, key, icon: Icon }) => (
          <div key={key} className="bg-white rounded-card p-5 border border-line shadow-card">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-brand-soft text-brand">
              <Icon size={20} />
            </div>
            <p className="text-3xl font-serif text-tone">{stats[key].toLocaleString()}</p>
            <p className="text-tone-faint text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent prayers */}
        <div className="bg-white rounded-card p-6 border border-line shadow-card">
          <h2 className="font-serif text-lg text-tone mb-4">Recent Prayer Requests</h2>
          <div className="space-y-1">
            {activity.prayers.length === 0 && <p className="text-tone-faint text-sm">No prayer requests yet.</p>}
            {activity.prayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
                <p className="text-sm text-tone truncate flex-1 mr-3">{p.title}</p>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusPill(p.status)}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent devotions */}
        <div className="bg-white rounded-card p-6 border border-line shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg text-tone">Recent Devotions</h2>
            <span className="text-xs text-tone-faint">{stats.devotions} published</span>
          </div>
          <div className="space-y-1">
            {activity.devotions.length === 0 && <p className="text-tone-faint text-sm">No devotions yet.</p>}
            {activity.devotions.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
                <p className="text-sm text-tone truncate flex-1 mr-3">{d.title}</p>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${d.is_published ? "bg-ok/15 text-ok" : "bg-line text-tone-faint"}`}>
                  {d.is_published ? "Published" : "Draft"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
