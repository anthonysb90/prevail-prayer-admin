"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Music, ToggleLeft, ToggleRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Track { id: string; title: string; artist: string | null; file_url: string | null; is_bundled: boolean; is_available: boolean; duration_seconds: number | null; sort_order: number }

export default function MusicPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const supabase = createClient();

  useEffect(() => {
    supabase.from("music_tracks").select("*").order("sort_order")
      .then(({ data }) => { setTracks(data ?? []); setLoading(false); });
  }, []);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const { data } = await supabase.from("music_tracks")
      .insert({ title: newTitle.trim(), artist: newArtist.trim() || null, file_url: newUrl.trim() || null, is_available: true, sort_order: tracks.length })
      .select().single();
    if (data) { setTracks((t) => [...t, data]); setNewTitle(""); setNewArtist(""); setNewUrl(""); setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this track?")) return;
    await supabase.from("music_tracks").delete().eq("id", id);
    setTracks((t) => t.filter((x) => x.id !== id));
  };

  const toggleAvailable = async (track: Track) => {
    await supabase.from("music_tracks").update({ is_available: !track.is_available }).eq("id", track.id);
    setTracks((t) => t.map((x) => x.id === track.id ? { ...x, is_available: !x.is_available } : x));
  };

  const inputClass = "w-full bg-white border border-line rounded-xl px-4 py-3 text-tone focus:outline-none focus:ring-2 focus:ring-brand text-sm";

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-tone">Music Tracks</h1>
          <p className="text-tone-faint text-sm mt-1">{tracks.length} tracks · used in Prayer Timer</p>
        </div>
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 bg-brand hover:bg-brand-deep text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">
          <Plus size={16} /> Add Track
        </button>
      </div>

      {adding && (
        <div className="bg-white rounded-card p-5 shadow-card mb-6 space-y-3">
          <h3 className="font-semibold text-sm text-tone">New Track</h3>
          <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={inputClass} placeholder="Track title" />
          <input type="text" value={newArtist} onChange={(e) => setNewArtist(e.target.value)} className={inputClass} placeholder="Artist (optional)" />
          <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className={inputClass} placeholder="Supabase Storage URL (optional — add after upload)" />
          <p className="text-xs text-tone-faint">Upload the .mp3 file to Supabase Storage first, then paste the public URL here.</p>
          <div className="flex gap-3">
            <button onClick={handleAdd} className="bg-brand hover:bg-brand-deep text-white text-sm font-semibold px-4 py-2 rounded-xl">Add Track</button>
            <button onClick={() => setAdding(false)} className="text-tone-faint text-sm hover:text-tone-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? <p className="text-tone-faint text-sm">Loading...</p> : tracks.length === 0 ? (
          <div className="bg-white rounded-card p-10 text-center text-tone-faint shadow-card">
            <Music size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tracks yet. Add your first prayer ambient track.</p>
          </div>
        ) : tracks.map((t) => (
          <div key={t.id} className="bg-white rounded-card p-5 shadow-card flex items-center gap-4">
            <div className="w-10 h-10 bg-charcoal-900 rounded-xl flex items-center justify-center shrink-0">
              <Music size={18} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-tone text-sm truncate">{t.title}</p>
              <p className="text-xs text-tone-faint mt-0.5">
                {t.artist ?? "No artist"} · {t.is_bundled ? "Bundled" : "Downloadable"}
                {t.file_url ? "" : " · No file yet"}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => toggleAvailable(t)} className="flex items-center gap-1.5 text-xs font-medium text-tone-faint hover:text-tone transition-colors">
                {t.is_available ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                {t.is_available ? "Live" : "Hidden"}
              </button>
              <button onClick={() => handleDelete(t.id)} className="p-1.5 text-tone-faint hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
