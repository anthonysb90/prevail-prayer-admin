import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus, Pencil } from "lucide-react";
import { format } from "date-fns";

export default async function DevotionsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("devotions")
    .select("id, title, is_published, published_at, created_at")
    .order("created_at", { ascending: false });
  const devotions = data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-tone">Devotions</h1>
          <p className="text-tone-faint text-sm mt-1">{devotions.length} total</p>
        </div>
        <Link
          href="/devotions/new"
          className="flex items-center gap-2 bg-brand hover:bg-brand-deep text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={16} /> New Devotion
        </Link>
      </div>

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
                  <td className="px-6 py-4 font-medium text-tone">{d.title}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      d.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {d.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-tone-faint">
                    {d.published_at ? format(new Date(d.published_at), "MMM d, yyyy") : "—"}
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
    </div>
  );
}
