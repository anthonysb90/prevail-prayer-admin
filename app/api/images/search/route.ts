import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkContributorPassword } from "@/lib/contributorAuth";
import { rateLimit } from "@/lib/rateLimit";

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

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Allow the request only if it comes from a signed-in admin OR carries the
 *  correct contributor password. Without this the route is a free proxy that
 *  burns the Unsplash/Pexels quota for anyone on the internet. */
async function authorize(req: NextRequest): Promise<boolean> {
  const pass = req.headers.get("x-contrib-pass");
  if (pass && (await checkContributorPassword(pass))) return true;

  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return false;
    const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", auth.user.id).single();
    return !!me?.is_admin;
  } catch {
    return false;
  }
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
  if (!(await authorize(req))) {
    return NextResponse.json({ images: [], error: "Not authorized." }, { status: 401 });
  }

  // 30 searches per minute per IP is plenty for a human picking a photo.
  const limit = rateLimit(`img-search:${clientIp(req)}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { images: [], error: "Too many searches. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

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
