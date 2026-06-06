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
    supabase
      .from("prayer_requests")
      .select("id, title, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("devotions")
      .select("id, title, published_at, is_published")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  return { prayers: prayers.data ?? [], devotions: devotionList.data ?? [] };
}

const STAT_CARDS = [
  { label: "Total Users", key: "users", icon: Users, color: "bg-blue-50 text-blue-600" },
  { label: "Active Prayers", key: "activePrayers", icon: BookOpen, color: "bg-amber-50 text-amber-600" },
  { label: "Answered Prayers", key: "answeredPrayers", icon: Heart, color: "bg-green-50 text-green-600" },
  { label: "Prayer Sessions", key: "sessions", icon: Timer, color: "bg-purple-50 text-purple-600" },
] as const;

export default async function DashboardPage() {
  const [stats, activity] = await Promise.all([getStats(), getRecentActivity()]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-900">Dashboard</h1>
        <p className="text-charcoal-400 text-sm mt-1">Overview of Prevail Prayer activity</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {STAT_CARDS.map(({ label, key, icon: Icon, color }) => (
          <div key={key} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-3xl font-bold text-charcoal-900">{stats[key].toLocaleString()}</p>
            <p className="text-charcoal-400 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent prayers */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-charcoal-900 mb-4">Recent Prayer Requests</h2>
          <div className="space-y-3">
            {activity.prayers.length === 0 && (
              <p className="text-charcoal-400 text-sm">No prayer requests yet.</p>
            )}
            {activity.prayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-cream-100 last:border-0">
                <p className="text-sm text-charcoal-900 truncate flex-1 mr-3">{p.title}</p>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  p.status === "answered" ? "bg-green-100 text-green-700" :
                  p.status === "ongoing"  ? "bg-purple-100 text-purple-700" :
                  "bg-blue-100 text-blue-700"
                }`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent devotions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-charcoal-900">Recent Devotions</h2>
            <span className="text-xs text-charcoal-400">{stats.devotions} published</span>
          </div>
          <div className="space-y-3">
            {activity.devotions.length === 0 && (
              <p className="text-charcoal-400 text-sm">No devotions yet.</p>
            )}
            {activity.devotions.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-cream-100 last:border-0">
                <p className="text-sm text-charcoal-900 truncate flex-1 mr-3">{d.title}</p>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  d.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}>{d.is_published ? "Published" : "Draft"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
