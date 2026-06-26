"use client";
import { useState } from "react";
import { Search, X, ExternalLink, Loader2 } from "lucide-react";

interface Img {
  id: string;
  source: "unsplash" | "pexels";
  thumb: string;
  full: string;
  photographer: string;
  photographerUrl: string;
  htmlUrl: string;
  downloadLocation?: string;
}

type SourceFilter = "both" | "unsplash" | "pexels";

export default function ImagePickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [source, setSource] = useState<SourceFilter>("both");
  const [images, setImages] = useState<Img[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/images/search?q=${encodeURIComponent(q)}&source=${source}`);
      const data = await res.json();
      setImages(data.images ?? []);
      if (data.error) setError(data.error);
    } catch {
      setError("Search failed. Please try again.");
    }
    setLoading(false);
  };

  const choose = async (img: Img) => {
    // Unsplash guideline: ping the download endpoint when a photo is used.
    if (img.source === "unsplash" && img.downloadLocation) {
      fetch("/api/images/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloadLocation: img.downloadLocation }),
      }).catch(() => {});
    }
    onSelect(img.full);
    onClose();
  };

  const tab = (val: SourceFilter, label: string) => (
    <button
      type="button"
      onClick={() => setSource(val)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        source === val ? "bg-brand text-white" : "bg-page text-tone-muted hover:bg-line"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-card w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h2 className="font-serif text-lg text-tone">Browse Photos</h2>
          <button onClick={onClose} className="text-tone-faint hover:text-tone">
            <X size={20} />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-5 border-b border-line flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tone-faint" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Search e.g. mountains, prayer, sunrise, cross…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-line text-sm text-tone focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="flex items-center gap-2">
            {tab("both", "Both")}
            {tab("unsplash", "Unsplash")}
            {tab("pexels", "Pexels")}
          </div>
          <button
            type="button"
            onClick={runSearch}
            disabled={loading || !q.trim()}
            className="bg-brand hover:bg-brand-deep text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-60"
          >
            Search
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-tone-faint">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-tone-muted text-sm">{error}</div>
          ) : !searched ? (
            <div className="text-center py-16 text-tone-faint text-sm">
              Search Unsplash and Pexels for a free, royalty-free photo.
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-16 text-tone-faint text-sm">No results. Try another term.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <div key={img.id} className="group relative rounded-xl overflow-hidden border border-line">
                  <button type="button" onClick={() => choose(img)} className="block w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.thumb} alt="" className="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 flex items-center justify-between">
                    <a
                      href={img.photographerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-white/90 truncate hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {img.photographer} <ExternalLink size={9} />
                    </a>
                    <span className="text-[9px] uppercase tracking-wide text-white/70">{img.source}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
