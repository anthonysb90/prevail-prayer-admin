import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Plus, Pencil, UserPlus } from "lucide-react";
import ImportDevotions from "@/components/ui/ImportDevotions";
import DraftsManager from "@/components/ui/DraftsManager";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DevotionsPage({ searchParams }: { searchParams: { review?: string; status?: string } }) {
  const supabase = createAdminClient() ?? createClient();
  // Backwards-compatible: ?review=1 maps to the review filter.
  const status = searchParams?.status ?? (searchParams?.review === "1" ? "review" : "all");

  let q = supabase
    .from("devotions")
    .select("id, title, is_published, published_at, scheduled_for, created_at, submitted_by")
    .order("created_at", { ascending: false });
  if (status === "review") q = q.not("submitted_by", "is", null).eq("is_published", false);
  else if (status === "draft") q = q.eq("is_published", false).is("scheduled_for", null);
  else if (status === "scheduled") q = q.eq("is_published", false).not("scheduled_for", "is", null);
  else if (status === "published") q = q.eq("is_published", true);
  const { data } = await q;
  const devotions = data ?? [];

  const { count: pendingCount } = await supabase
    .from("devotions").select("id", { count: "exact", head: true })
    .not("submitted_by", "is", null).eq("is_published", false);
  const { count: draftCount } = await supabase
    .from("devotions").select("id", { count: "exact", head: true })
    .eq("is_published", false).is("scheduled_for", null);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-tone">Devotions</h1>
          <p className="text-tone-faint text-sm mt-1">{devotions.length} total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {([
            ["all", "All", undefined],
            ["draft", "Drafts", draftCount || undefined],
            ["scheduled", "Scheduled", undefined],
            ["published", "Published", undefined],
            ["review", "Needs review", pendingCount || undefined],
          ] as const).map(([val, label, count]) => {
            const active = status === val;
            const href = val === "all" ? "/devotions" : `/devotions?status=${val}`;
            const activeCls = val === "review" ? "bg-amber-100 text-amber-700 font-semibold"
              : val === "draft" ? "bg-gray-200 text-gray-700 font-semibold"
              : "bg-brand-soft text-brand-deep font-semibold";
            return (
              <Link key={val} href={href} className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${active ? activeCls : "text-tone-muted hover:bg-page"}`}>
                {label}{count ? ` (${count})` : ""}
              </Link>
            );
          })}
          <Link href="/devotions/calendar" className="text-sm px-3 py-1.5 rounded-lg text-tone-muted hover:bg-page transition-colors">Calendar</Link>
          <Link href="/settings#submissions" className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg text-tone-muted hover:bg-page transition-colors" title="Share a link so others can submit devotions">
            <UserPlus size={15} /> Invite a writer
          </Link>
          <ImportDevotions />
          <Link
            href="/devotions/new"
            className="flex items-center gap-2 bg-brand hover:bg-brand-deep text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
          >
            <Plus size={16} /> New Devotion
          </Link>
        </div>
      </div>

      {status === "draft" ? (
        <DraftsManager rows={devotions.map((d) => ({ id: d.id, title: d.title }))} />
      ) : (
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        {devotions.length === 0 ? (
          <div className="text-center py-16 text-tone-faint">No devotions yet. Create your first one.</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-tone-faint uppercase tracking-wider">Title</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-tone-faint uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-tone-faint uppercase tracking-wider">Published</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {devotions.map((d) => (
                <tr key={d.id} className="hover:bg-page transition-colors">
                  <td className="px-6 py-4 font-medium text-tone">
                    <div className="flex items-center gap-2">
                      <span>{d.title}</span>
                      {d.submitted_by && !d.is_published && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Review · {d.submitted_by}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      d.is_published ? "bg-green-100 text-green-700"
                        : d.scheduled_for ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {d.is_published ? "Published" : d.scheduled_for ? "Scheduled" : "Draft"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-tone-faint">
                    {d.published_at
                      ? format(new Date(d.published_at), "MMM d, yyyy")
                      : d.scheduled_for
                      ? format(new Date(d.scheduled_for), "MMM d, yyyy")
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/devotions/${d.id}`} className="inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand font-medium">
                      <Pencil size={14} /> Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      )}
    </div>
  );
}
