"use client";
import { useState, useRef } from "react";
import { Upload, X, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseCSV, rowsToScriptures, ScriptureRow } from "@/lib/csv";

export default function ImportScriptures({ onImported }: { onImported?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ScriptureRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const reset = () => { setItems([]); setError(null); setDone(null); };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    reset();
    const f = e.target.files?.[0];
    if (!f) return;
    const { items, error } = rowsToScriptures(parseCSV(await f.text()));
    if (error) { setError(error); return; }
    setItems(items);
  };

  const run = async () => {
    setImporting(true); setError(null);
    const supabase = createClient();
    // sort_order: sequential within each topic, appended after existing
    const byTopic: Record<string, number> = {};
    const payload = items.map((it) => {
      const n = byTopic[it.topic] ?? 0; byTopic[it.topic] = n + 1;
      return { reference: it.reference, verse_text: it.verse_text, topic: it.topic, is_featured: it.is_featured, sort_order: n };
    });
    const { data, error } = await supabase.from("scripture_verses").insert(payload).select("id");
    if (error) { setError(error.message); setImporting(false); return; }
    setDone(data?.length ?? items.length); setImporting(false); onImported?.();
  };

  const topics = [...new Set(items.map((i) => i.topic))];

  return (
    <>
      <button onClick={() => { reset(); setOpen(true); }} className="flex items-center gap-2 bg-white border border-line hover:bg-page text-tone font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">
        <Upload size={16} /> Import CSV
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-card w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-line">
              <h2 className="font-serif text-lg text-tone">Import Scripture from CSV</h2>
              <button onClick={() => setOpen(false)} className="text-tone-faint hover:text-tone"><X size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto">
              {done !== null ? (
                <div className="text-center py-12">
                  <CheckCircle2 size={44} className="mx-auto text-ok mb-3" />
                  <p className="text-tone font-semibold">Imported {done} verse{done === 1 ? "" : "s"}.</p>
                  <button onClick={() => setOpen(false)} className="mt-6 bg-brand text-white font-semibold px-5 py-2.5 rounded-xl text-sm">Done</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
                    <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 bg-page border border-line rounded-xl px-4 py-2.5 text-sm text-tone"><FileText size={16} /> Choose CSV file</button>
                    {items.length > 0 && <span className="text-sm text-tone-muted">{items.length} verses · {topics.length} topic{topics.length === 1 ? "" : "s"}</span>}
                  </div>
                  {error && <div className="mb-4 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-tone">{error}</div>}
                  {items.length === 0 ? (
                    <div className="text-center py-10 text-tone-faint text-sm">
                      Required columns: <code className="font-mono text-xs">reference, verse_text, topic, is_featured</code>.
                      <br /><code className="font-mono">is_featured</code> is optional (true/false) — featured verses can appear on the home screen.
                    </div>
                  ) : (
                    <div className="border border-line rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-page"><tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-tone-faint uppercase">Reference</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-tone-faint uppercase">Topic</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-tone-faint uppercase">Featured</th>
                        </tr></thead>
                        <tbody className="divide-y divide-line">
                          {items.slice(0, 60).map((it, i) => (
                            <tr key={i}>
                              <td className="px-4 py-2.5 text-tone font-medium">{it.reference}</td>
                              <td className="px-4 py-2.5 text-tone-muted">{it.topic}</td>
                              <td className="px-4 py-2.5">{it.is_featured ? <span className="text-brand text-xs font-semibold">★ Featured</span> : <span className="text-tone-faint text-xs">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {items.length > 60 && <div className="px-4 py-2 text-xs text-tone-faint">…and {items.length - 60} more</div>}
                    </div>
                  )}
                </>
              )}
            </div>
            {done === null && items.length > 0 && (
              <div className="p-5 border-t border-line flex justify-end gap-3">
                <button onClick={() => setOpen(false)} className="px-4 py-2.5 text-sm text-tone-muted">Cancel</button>
                <button onClick={run} disabled={importing} className="flex items-center gap-2 bg-brand hover:bg-brand-deep text-white font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60">
                  {importing ? <><Loader2 size={16} className="animate-spin" /> Importing…</> : <>Import {items.length} verse{items.length === 1 ? "" : "s"}</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
