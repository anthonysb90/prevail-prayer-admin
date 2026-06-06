import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { Users } from "lucide-react";

export default async function UsersPage() {
  const supabase = createClient();

  const { data: profiles = [], count } = await supabase
    .from("profiles")
    .select("id, display_name, prayer_streak, subscription_status, last_prayer_date, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);

  const statusColors: Record<string, string> = {
    free:    "bg-gray-100 text-gray-600",
    trial:   "bg-blue-100 text-blue-700",
    premium: "bg-green-100 text-green-700",
    expired: "bg-red-100 text-red-600",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-900">Users</h1>
        <p className="text-charcoal-400 text-sm mt-1">{count?.toLocaleString() ?? 0} total accounts</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {profiles.length === 0 ? (
          <div className="text-center py-16 text-charcoal-400">
            <Users size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No users yet.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-cream-200">
              <tr>
                {["Name", "Subscription", "Streak", "Last Prayed", "Joined"].map((h) => (
                  <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-charcoal-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {profiles.map((u) => (
                <tr key={u.id} className="hover:bg-cream-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-charcoal-900 text-sm">
                    {u.display_name ?? <span className="text-charcoal-400 italic">No name</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColors[u.subscription_status ?? "free"] ?? statusColors.free}`}>
                      {u.subscription_status ?? "free"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-charcoal-600">{u.prayer_streak ?? 0}d 🔥</td>
                  <td className="px-6 py-4 text-sm text-charcoal-400">
                    {u.last_prayer_date ? format(new Date(u.last_prayer_date), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-charcoal-400">
                    {format(new Date(u.created_at), "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
