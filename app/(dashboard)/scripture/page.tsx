"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TOPICS = ["Prayer","Faith","Healing","Peace","Guidance","Trust","Praise","Warfare","Salvation","Hope"];

interface Verse { id: string; reference: string; verse_text: string; topic: string; is_featured: boolean }

export default function ScripturePage() {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [topic, setTopic] = useState("Prayer");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newRef, setNewRef] = useState("");
  const [newText, setNewText] = useState("");

  const supabase = createClient();

  useEffect(() => {
    setLoading(true);
    supabase.from("scripture_verses").select("*").eq("topic", topic).order("sort_order")
      .then(({ data }) => { setVerses(data ?? []); setLoading(false); });
  }, [topic]);

  const handleAdd = async () => {
    if (!newRef.trim() || !newText.trim()) return;
    const { data } = await supabase.from("scripture_verses")
      .insert({ reference: newRef.trim(), verse_text: newText.trim(), topic, sort_order: verses.length })
      .select().single();
    if (data) { setVerses((v) => [...v, data]); setNewRef(""); setNewText(""); setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this verse?")) return;
    await supabase.from("scripture_verses").delete().eq("id", id);
    setVerses((v) => v.filter((x) => x.id !== id));
  };

  const toggleFeatured = async (verse: Verse) => {
    await supabase.from("scripture_verses").update({ is_featured: !verse.is_featured }).eq("id", verse.id);
    setVerses((v) => v.map((x) => x.id === verse.id ? { ...x, is_featured: !x.is_featured } : x));
  };

  const inputClass = "w-full bg-white border border-line rounded-xl px-4 py-3 text-tone focus:outline-none focus:ring-2 focus:ring-brand text-sm";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-tone">Scripture Library</h1>
          <p className="text-tone-faint text-sm mt-1">KJV — {verses.length} verses in this topic</p>
        </div>
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 bg-brand hover:bg-brand-deep text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">
          <Plus size={16} /> Add Verse
        </button>
      </div>

      {/* Topic tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TOPICS.map((t) => (
          <button key={t} onClick={() => setTopic(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${topic === t ? "bg-charcoal-900 text-white" : "bg-white text-tone-muted hover:bg-cream-200"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white rounded-card p-5 shadow-card mb-6 space-y-3">
          <h3 className="font-semibold text-sm text-tone">New Verse — {topic}</h3>
          <input type="text" value={newRef} onChange={(e) => setNewRef(e.target.value)} className={inputClass} placeholder="Reference (e.g. John 3:16)" />
          <textarea value={newText} onChange={(e) => setNewText(e.target.value)} rows={3} className={inputClass} placeholder="Verse text (KJV)" />
          <div className="flex gap-3">
            <button onClick={handleAdd} className="bg-brand hover:bg-brand-deep text-white text-sm font-semibold px-4 py-2 rounded-xl">Add</button>
            <button onClick={() => setAdding(false)} className="text-tone-faint text-sm hover:text-tone-muted">Cancel</button>
          </div>
        </div>
      )}

      {/* Verses list */}
      <div className="space-y-3">
        {loading ? <p className="text-tone-faint text-sm">Loading...</p> : verses.map((v) => (
          <div key={v.id} className="bg-white rounded-card p-5 shadow-card flex gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-brand bg-brand-soft px-2 py-1 rounded-full">{v.reference}</span>
                {v.is_featured && <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">Featured</span>}
              </div>
              <p className="text-sm text-tone leading-relaxed italic">"{v.verse_text}"</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={() => toggleFeatured(v)} className={`p-1.5 rounded-lg transition-colors ${v.is_featured ? "text-brand bg-brand-soft" : "text-tone-faint hover:bg-page"}`}>
                <Star size={16} />
              </button>
              <button onClick={() => handleDelete(v.id)} className="p-1.5 text-tone-faint hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
