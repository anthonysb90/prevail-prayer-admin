"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Plus, Trash2, Music, ToggleLeft, ToggleRight, Pencil, UploadCloud, X, Check } from "lucide-react";
import { listTracks, uploadTrack, renameTrack, setTrackAvailable, deleteTrack } from "./actions";

interface Track {
  id: string;
  title: string;
  artist: string | null;
  file_url: string | null;
  is_bundled: boolean;
  is_available: boolean;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  sort_order: number;
  bundle_key?: string | null;
}

const inputClass = "w-full bg-white border border-line rounded-xl px-4 py-3 text-tone focus:outline-none focus:ring-2 focus:ring-brand text-sm";

function fmtSize(bytes: number | null) {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function MusicPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Upload form
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Inline rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");

  const refresh = () => {
    listTracks().then((r) => {
      if (r.error) setError(r.error);
      else setTracks(r.tracks as Track[]);
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  const resetForm = () => {
    setTitle(""); setArtist(""); setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setAdding(false);
  };

  const handleUpload = () => {
    setError(null);
    if (!title.trim()) { setError("Title is required."); return; }
    if (!file) { setError("Choose an audio file."); return; }
    const fd = new FormData();
    fd.set("title", title);
    fd.set("artist", artist);
    fd.set("file", file);
    startTransition(async () => {
      const res = await uploadTrack(fd);
      if (res.error) setError(res.error);
      else { resetForm(); refresh(); }
    });
  };

  const startEdit = (t: Track) => { setEditingId(t.id); setEditTitle(t.title); setEditArtist(t.artist ?? ""); };
  const saveEdit = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await renameTrack(id, editTitle, editArtist);
      if (res.error) setError(res.error);
      else { setEditingId(null); refresh(); }
    });
  };

  const toggle = (t: Track) => startTransition(async () => {
    const res = await setTrackAvailable(t.id, !t.is_available);
    if (res.error) setError(res.error); else refresh();
  });

  const remove = (t: Track) => {
    if (!confirm(`Delete "${t.title}"? This removes it from the app${t.is_bundled ? "" : " and deletes the uploaded file"}.`)) return;
    startTransition(async () => {
      const res = await deleteTrack(t.id);
      if (res.error) setError(res.error); else refresh();
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-tone">Music Tracks</h1>
          <p className="text-tone-faint text-sm mt-1">{tracks.length} tracks · used in the Prayer Timer</p>
        </div>
        <button onClick={() => setAdding((v) => !v)} className="flex items-center gap-2 bg-brand hover:bg-brand-deep text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">
          <Plus size={16} /> Upload Track
        </button>
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}

      {adding && (
        <div className="bg-white rounded-card p-5 shadow-card mb-6 space-y-3">
          <h3 className="font-semibold text-sm text-tone">Upload a new track</h3>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Track title" />
          <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} className={inputClass} placeholder="Artist (optional)" />
          <div>
            <input ref={fileRef} type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,.mp3,.m4a,.wav" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" id="music-file" />
            <label htmlFor="music-file" className="flex items-center gap-2 cursor-pointer border border-dashed border-line rounded-xl px-4 py-3 text-sm text-tone-muted hover:border-brand hover:text-brand transition-colors">
              <UploadCloud size={18} />
              {file ? `${file.name} · ${fmtSize(file.size)}` : "Choose an audio file (.mp3, .m4a, .wav — max 30 MB)"}
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={handleUpload} disabled={pending} className="bg-brand hover:bg-brand-deep text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50">
              {pending ? "Uploading…" : "Upload Track"}
            </button>
            <button onClick={resetForm} className="text-tone-faint text-sm hover:text-tone-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? <p className="text-tone-faint text-sm">Loading…</p> : tracks.length === 0 ? (
          <div className="bg-white rounded-card p-10 text-center text-tone-faint shadow-card">
            <Music size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tracks yet. Upload your first prayer ambient track.</p>
          </div>
        ) : tracks.map((t) => (
          <div key={t.id} className="bg-white rounded-card p-5 shadow-card flex items-center gap-4">
            <div className="w-10 h-10 bg-ink rounded-xl flex items-center justify-center shrink-0">
              <Music size={18} className="text-brand-ondark" />
            </div>

            {editingId === t.id ? (
              <div className="flex-1 min-w-0 space-y-2">
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={inputClass} placeholder="Title" />
                <input value={editArtist} onChange={(e) => setEditArtist(e.target.value)} className={inputClass} placeholder="Artist (optional)" />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(t.id)} disabled={pending} className="flex items-center gap-1 bg-brand text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"><Check size={14} /> Save</button>
                  <button onClick={() => setEditingId(null)} className="flex items-center gap-1 text-tone-faint text-xs px-3 py-1.5 rounded-lg hover:text-tone-muted"><X size={14} /> Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-tone text-sm truncate">{t.title}</p>
                <p className="text-xs text-tone-faint mt-0.5">
                  {t.artist ?? "No artist"} · {t.is_bundled ? "Built-in" : "Uploaded"}
                  {fmtSize(t.file_size_bytes) ? ` · ${fmtSize(t.file_size_bytes)}` : ""}
                  {!t.is_bundled && !t.file_url ? " · No file yet" : ""}
                </p>
              </div>
            )}

            {editingId !== t.id && (
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggle(t)} disabled={pending} className="flex items-center gap-1.5 text-xs font-medium text-tone-faint hover:text-tone transition-colors">
                  {t.is_available ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                  {t.is_available ? "Live" : "Hidden"}
                </button>
                <button onClick={() => startEdit(t)} className="p-1.5 text-tone-faint hover:text-brand rounded-lg hover:bg-page transition-colors" title="Rename"><Pencil size={16} /></button>
                <button onClick={() => remove(t)} disabled={pending} className="p-1.5 text-tone-faint hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="Delete"><Trash2 size={16} /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
