import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { format } from "date-fns";
import { Users, Search } from "lucide-react";
import { zipToState, formatPhone } from "@/lib/zip";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createAdminClient() ?? createClient();
  const usingAdmin = !!createAdminClient();
  const q = (searchParams?.q ?? "").trim();

  let query = supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, phone, zip_code, prayer_streak, subscription_status, last_prayer_date, last_active_at, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (q) {
    query = query.or(`display_name.ilike.%${q}%,phone.ilike.%${q}%,zip_code.ilike.%${q}%`);
  }

  const { data, count } = await query;
  const profiles = data ?? [];

  const statusColors: Record<string, string> = {
    free: "bg-gray-100 text-gray-600",
    trial: "bg-blue-100 text-blue-700",
    premium: "bg-green-100 text-green-700",
    expired: "bg-red-100 text-red-600",
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-serif text-tone">Users</h1>
          <p className="text-tone-faint text-sm mt-1">{count?.toLocaleString() ?? 0} total accounts</p>
        </div>
        <form className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tone-faint" />
          <input
            type="text" name="q" defaultValue={q} placeholder="Search name, phone, zip…"
            className="pl-9 pr-4 py-2.5 rounded-card border border-line bg-white text-sm text-tone w-72 outline-none focus:border-brand"
          />
        </form>
      </div>

      {!usingAdmin && (
        <div className="mb-4 rounded-card border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-tone">
          Add <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> in Vercel (mark Sensitive) and redeploy to load full user data.
        </div>
      )}

      <div className="bg-white rounded-card shadow-card overflow-hidden">
        {profiles.length === 0 ? (
          <div className="text-center py-16 text-tone-faint">
            <Users size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{q ? "No users match your search." : "No users yet."}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                {["Name", "Phone", "Location", "Subscription", "Streak", "Last Active", "Joined"].map((h) => (
                  <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-tone-faint uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {profiles.map((u: any) => {
                const state = zipToState(u.zip_code);
                const lastActive = u.last_active_at ?? u.last_prayer_date;
                return (
                  <tr key={u.id} className="hover:bg-page transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover bg-brand-soft" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-brand-soft text-brand flex items-center justify-center text-sm font-serif">
                            {(u.display_name?.[0] ?? "?").toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-tone text-sm">
                          {u.display_name ?? <span className="text-tone-faint italic">No name</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-tone-muted">{formatPhone(u.phone)}</td>
                    <td className="px-5 py-4 text-sm text-tone-muted">
                      {u.zip_code ? `${u.zip_code}${state ? ` · ${state}` : ""}` : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColors[u.subscription_status ?? "free"] ?? statusColors.free}`}>
                        {u.subscription_status ?? "free"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-tone-muted">{u.prayer_streak ?? 0}d</td>
                    <td className="px-5 py-4 text-sm text-tone-faint">
                      {lastActive ? format(new Date(lastActive), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-tone-faint">
                      {format(new Date(u.created_at), "MMM d, yyyy")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
