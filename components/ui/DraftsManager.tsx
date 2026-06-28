"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { deleteDevotions, deleteAllDrafts } from "@/app/(dashboard)/devotions/actions";

export interface DraftRow {
  id: string;
  title: string;
}

export default function DraftsManager({ rows }: { rows: DraftRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));

  const run = (fn: () => Promise<{ error?: string }>, confirmMsg: string) => {
    if (!confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setError(res.error);
      else { setSelected(new Set()); router.refresh(); }
    });
  };

  const deleteSelected = () =>
    run(() => deleteDevotions(Array.from(selected)), `Permanently delete ${selected.size} draft${selected.size === 1 ? "" : "s"}? This can't be undone.`);
  const deleteEvery = () =>
    run(() => deleteAllDrafts(), `Permanently delete ALL ${rows.length} drafts? This can't be undone.`);

  if (rows.length === 0) {
    return <div className="bg-white rounded-card shadow-card text-center py-16 text-tone-faint">No drafts.</div>;
  }

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-line bg-page/50">
        <label className="flex items-center gap-2 text-sm text-tone-muted cursor-pointer">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 accent-brand" />
          {selected.size > 0 ? `${selected.size} selected` : "Select all"}
        </label>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            type="button" onClick={deleteSelected} disabled={pending || selected.size === 0}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white disabled:opacity-40 hover:bg-red-700 transition-colors"
          >
            <Trash2 size={14} /> Delete selected
          </button>
          <button
            type="button" onClick={deleteEvery} disabled={pending}
            className="text-sm font-medium px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            Delete all drafts
          </button>
        </div>
      </div>

      <table className="w-full">
        <tbody className="divide-y divide-line">
          {rows.map((d) => (
            <tr key={d.id} className={`transition-colors ${selected.has(d.id) ? "bg-brand-soft/40" : "hover:bg-page"}`}>
              <td className="pl-6 pr-2 py-4 w-10">
                <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} className="w-4 h-4 accent-brand" />
              </td>
              <td className="px-2 py-4 font-medium text-tone">{d.title}</td>
              <td className="px-6 py-4">
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600">Draft</span>
              </td>
              <td className="px-6 py-4 text-right">
                <Link href={`/devotions/${d.id}`} className="inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand font-medium">
                  <Pencil size={14} /> Schedule / edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
