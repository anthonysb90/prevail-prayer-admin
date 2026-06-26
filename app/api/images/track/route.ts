import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Unsplash API guideline: trigger the download endpoint when a photo is chosen.
export async function POST(req: NextRequest) {
  try {
    const { downloadLocation } = await req.json();
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (downloadLocation && key) {
      await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${key}` }, cache: "no-store" });
    }
  } catch {}
  return NextResponse.json({ ok: true });
}
