import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface Img {
  id: string;
  source: "unsplash" | "pexels";
  thumb: string;
  full: string;
  photographer: string;
  photographerUrl: string;
  htmlUrl: string;
  downloadLocation?: string; // Unsplash only
}

async function searchUnsplash(q: string, perPage: number): Promise<Img[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${perPage}&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` }, cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).map((p: any) => ({
    id: `u_${p.id}`,
    source: "unsplash" as const,
    thumb: p.urls?.small,
    full: p.urls?.regular,
    photographer: p.user?.name ?? "Unsplash",
    photographerUrl: p.user?.links?.html ?? "https://unsplash.com",
    htmlUrl: p.links?.html ?? "https://unsplash.com",
    downloadLocation: p.links?.download_location,
  }));
}

async function searchPexels(q: string, perPage: number): Promise<Img[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${perPage}&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: key }, cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.photos ?? []).map((p: any) => ({
    id: `p_${p.id}`,
    source: "pexels" as const,
    thumb: p.src?.medium,
    full: p.src?.large2x ?? p.src?.large,
    photographer: p.photographer ?? "Pexels",
    photographerUrl: p.photographer_url ?? "https://pexels.com",
    htmlUrl: p.url ?? "https://pexels.com",
  }));
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const source = req.nextUrl.searchParams.get("source") ?? "both";
  if (!q) return NextResponse.json({ images: [], error: "Enter a search term." });

  const hasUnsplash = !!process.env.UNSPLASH_ACCESS_KEY;
  const hasPexels = !!process.env.PEXELS_API_KEY;
  if (!hasUnsplash && !hasPexels) {
    return NextResponse.json(
      { images: [], error: "No image keys set. Add PEXELS_API_KEY and/or UNSPLASH_ACCESS_KEY in Vercel." },
      { status: 200 }
    );
  }

  const jobs: Promise<Img[]>[] = [];
  if (source !== "pexels") jobs.push(searchUnsplash(q, 18).catch(() => []));
  if (source !== "unsplash") jobs.push(searchPexels(q, 18).catch(() => []));
  const results = (await Promise.all(jobs)).flat();

  // Interleave sources so the grid mixes both providers.
  const u = results.filter((r) => r.source === "unsplash");
  const p = results.filter((r) => r.source === "pexels");
  const mixed: Img[] = [];
  for (let i = 0; i < Math.max(u.length, p.length); i++) {
    if (u[i]) mixed.push(u[i]);
    if (p[i]) mixed.push(p[i]);
  }
  return NextResponse.json({ images: mixed });
}
