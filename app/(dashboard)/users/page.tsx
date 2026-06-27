import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { format } from "date-fns";
import { Users, Search } from "lucide-react";
import { formatPhone } from "@/lib/zip";
import { ageFromBirthday } from "@/lib/age";
import { GiftProMenu } from "./GiftProMenu";
import { ExportUsersButton } from "./ExportUsersButton";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: { q?: string; page?: string; sort?: string; dir?: string } }) {
  const supabase = createAdminClient() ?? createClient();
  const usingAdmin = !!createAdminClient();
  const q = (searchParams?.q ?? "").trim();

  const PAGE_SIZE = 50;
  const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10) || 1);
  const SORTS: Record<string, string> = { joined: "created_at", streak: "prayer_streak", name: "display_name" };
  const sortKey = SORTS[searchParams?.sort ?? ""] ? (searchParams!.sort as string) : "joined";
  const sortCol = SORTS[sortKey];
  const dir: "asc" | "desc" = searchParams?.dir === "asc" ? "asc" : "desc";
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, phone, birthday, prayer_streak, subscription_status, comp_until, last_prayer_date, last_active_at, created_at",
      { count: "exact" }
    )
    .order(sortCol, { ascending: dir === "asc" })
    .range(from, from + PAGE_SIZE - 1);

  // Strip characters meaningful in a PostgREST `.or()` filter (injection guard).
  const safeQ = q.replace(/[,()*:\\%]/g, "").slice(0, 80);
  if (safeQ) query = query.or(`display_name.ilike.%${safeQ}%,phone.ilike.%${safeQ}%`);

  const { data, count } = await query;
  const profiles = data ?? [];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const qp = (over: Record<string, string | number>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    sp.set("sort", sortKey); sp.set("dir", dir); sp.set("page", String(page));
    for (const [k, v] of Object.entries(over)) sp.set(k, String(v));
    return `/users?${sp.toString()}`;
  };
  const sortHref = (key: string) => qp({ sort: key, dir: sortKey === key && dir === "desc" ? "asc" : "desc", page: 1 });
  const arrow = (key: string) => (sortKey === key ? (dir === "asc" ? " ↑" : " ↓") : "");

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
        <div className="flex items-end gap-3">
          <form className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tone-faint" />
            <input
              type="text" name="q" defaultValue={q} placeholder="Search name or phone…"
              className="pl-9 pr-4 py-2.5 rounded-card border border-line bg-white text-sm text-tone w-72 outline-none focus:border-brand"
            />
          </form>
          <ExportUsersButton q={q} />
        </div>
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
                <th className="text-left px-5 py-4 text-xs font-semibold text-tone-faint uppercase tracking-wider"><Link href={sortHref("name")} className="hover:text-tone">Name{arrow("name")}</Link></th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-tone-faint uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-tone-faint uppercase tracking-wider">Age</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-tone-faint uppercase tracking-wider">Subscription</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-tone-faint uppercase tracking-wider"><Link href={sortHref("streak")} className="hover:text-tone">Streak{arrow("streak")}</Link></th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-tone-faint uppercase tracking-wider">Last Active</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-tone-faint uppercase tracking-wider"><Link href={sortHref("joined")} className="hover:text-tone">Joined{arrow("joined")}</Link></th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-tone-faint uppercase tracking-wider">Pro Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {profiles.map((u: any) => {
                const age = ageFromBirthday(u.birthday);
                const lastActive = u.last_active_at ?? u.last_prayer_date;
                const comped = !!u.comp_until && new Date(u.comp_until).getTime() > Date.now();
                return (
                  <tr key={u.id} className="hover:bg-page transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/users/${u.id}`} className="flex items-center gap-3 group">
                        {u.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover bg-brand-soft" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-brand-soft text-brand flex items-center justify-center text-sm font-serif">
                            {(u.display_name?.[0] ?? "?").toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-tone text-sm group-hover:text-brand transition-colors">
                          {u.display_name ?? <span className="text-tone-faint italic">No name</span>}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm text-tone-muted">{formatPhone(u.phone)}</td>
                    <td className="px-5 py-4 text-sm text-tone-muted">{age != null ? age : "—"}</td>
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
                    <td className="px-5 py-4">
                      <GiftProMenu userId={u.id} comped={comped} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-tone-muted">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={qp({ page: page - 1 })} className="px-3 py-1.5 rounded-lg border border-line hover:border-brand">Prev</Link>}
            {page < totalPages && <Link href={qp({ page: page + 1 })} className="px-3 py-1.5 rounded-lg border border-line hover:border-brand">Next</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
