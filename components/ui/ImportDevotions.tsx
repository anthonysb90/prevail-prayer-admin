"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileText, Loader2, CalendarClock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseCSV, rowsToDevotions, DevotionRow } from "@/lib/csv";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// publish_date "" or invalid -> draft; <= today -> publish now; future -> scheduled
function classify(dateStr: string): { kind: "now" | "scheduled" | "draft"; iso: string | null } {
  if (!dateStr) return { kind: "draft", iso: null };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { kind: "draft", iso: null };
  return d <= startOfToday() ? { kind: "now", iso: d.toISOString() } : { kind: "scheduled", iso: d.toISOString() };
}

export default function ImportDevotions() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DevotionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [doneCount, setDoneCount] = useState<number | null>(null);

  const reset = () => { setItems([]); setError(null); setDoneCount(null); };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    reset();
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { items, error } = rowsToDevotions(parseCSV(text));
    if (error) { setError(error); return; }
    setItems(items);
  };

  const runImport = async () => {
    setImporting(true);
    setError(null);
    const supabase = createClient();

    const payload = items.map((it) => {
      const c = classify(it.publish_date);
      return {
        title: it.title,
        image_url: it.image_url || null,
        scripture_reference: it.scripture_reference || null,
        scripture_text: it.scripture_text || null,
        body: it.body,
        closing_prayer: it.closing_prayer || null,
        is_published: c.kind === "now",
        published_at: c.kind === "now" ? c.iso : null,
        scheduled_for: c.kind === "scheduled" ? c.iso : null,
      };
    });

    const { data, error } = await supabase.from("devotions").insert(payload).select("id");
    if (error || !data) { setError(error?.message ?? "Insert failed."); setImporting(false); return; }

    // Reflection questions (pipe-separated), matched to inserted rows by index.
    const questions: { devotion_id: string; question_text: string; sort_order: number }[] = [];
    data.forEach((row: { id: string }, i: number) => {
      const raw = items[i].reflection_questions;
      if (!raw) return;
      raw.split("|").map((q) => q.trim()).filter(Boolean).forEach((q, qi) => {
        questions.push({ devotion_id: row.id, question_text: q, sort_order: qi });
      });
    });
    if (questions.length) {
      const { error: qErr } = await supabase.from("devotion_questions").insert(questions);
      if (qErr) { setError(`Devotions imported, but questions failed: ${qErr.message}`); }
    }

    setDoneCount(data.length);
    setImporting(false);
    router.refresh();
  };

  const counts = items.reduce(
    (a, it) => { const k = classify(it.publish_date).kind; a[k]++; return a; },
    { now: 0, scheduled: 0, draft: 0 } as Record<string, number>
  );

  return (
    <>
      <button
        onClick={() => { reset(); setOpen(true); }}
        className="flex items-center gap-2 bg-white border border-line hover:bg-page text-tone font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
      >
        <Upload size={16} /> Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-card w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-line">
              <h2 className="font-serif text-lg text-tone">Import Devotions from CSV</h2>
              <button onClick={() => setOpen(false)} className="text-tone-faint hover:text-tone"><X size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto">
              {doneCount !== null ? (
                <div className="text-center py-12">
                  <CheckCircle2 size={44} className="mx-auto text-ok mb-3" />
                  <p className="text-tone font-semibold">Imported {doneCount} devotion{doneCount === 1 ? "" : "s"}.</p>
                  <p className="text-tone-faint text-sm mt-1">Scheduled ones will publish automatically on their date.</p>
                  <button onClick={() => setOpen(false)} className="mt-6 bg-brand text-white font-semibold px-5 py-2.5 rounded-xl text-sm">Done</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
                    <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 bg-page border border-line rounded-xl px-4 py-2.5 text-sm text-tone">
                      <FileText size={16} /> Choose CSV file
                    </button>
                    {items.length > 0 && (
                      <span className="text-sm text-tone-muted">
                        {items.length} rows · <span className="text-ok">{counts.now} now</span> · <span className="text-brand">{counts.scheduled} scheduled</span> · {counts.draft} draft
                      </span>
                    )}
                  </div>

                  {error && <div className="mb-4 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-tone">{error}</div>}

                  {items.length === 0 ? (
                    <div className="text-center py-10 text-tone-faint text-sm">
                      Required columns: <code className="font-mono text-xs">publish_date, title, scripture_reference, scripture_text, body, closing_prayer, image_url, reflection_questions</code>.
                      <br />Separate multiple reflection questions with <code className="font-mono">|</code>. Leave publish_date blank to import as a draft.
                    </div>
                  ) : (
                    <div className="border border-line rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-page">
                          <tr>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-tone-faint uppercase">Title</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-tone-faint uppercase">Reference</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-tone-faint uppercase">When</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {items.slice(0, 50).map((it, i) => {
                            const c = classify(it.publish_date);
                            return (
                              <tr key={i}>
                                <td className="px-4 py-2.5 text-tone">{it.title}</td>
                                <td className="px-4 py-2.5 text-tone-muted">{it.scripture_reference || "—"}</td>
                                <td className="px-4 py-2.5">
                                  {c.kind === "now" && <span className="text-ok text-xs font-medium">Publish now</span>}
                                  {c.kind === "scheduled" && (
                                    <span className="inline-flex items-center gap-1 text-brand text-xs font-medium">
                                      <CalendarClock size={13} /> {new Date(it.publish_date).toLocaleDateString()}
                                    </span>
                                  )}
                                  {c.kind === "draft" && <span className="text-tone-faint text-xs">Draft</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {items.length > 50 && <div className="px-4 py-2 text-xs text-tone-faint">…and {items.length - 50} more</div>}
                    </div>
                  )}
                </>
              )}
            </div>

            {doneCount === null && items.length > 0 && (
              <div className="p-5 border-t border-line flex justify-end gap-3">
                <button onClick={() => setOpen(false)} className="px-4 py-2.5 text-sm text-tone-muted">Cancel</button>
                <button
                  onClick={runImport}
                  disabled={importing}
                  className="flex items-center gap-2 bg-brand hover:bg-brand-deep text-white font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60"
                >
                  {importing ? <><Loader2 size={16} className="animate-spin" /> Importing…</> : <>Import {items.length} devotion{items.length === 1 ? "" : "s"}</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
