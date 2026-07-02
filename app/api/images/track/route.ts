import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Unsplash API guideline: trigger the download endpoint when a photo is chosen.
// SECURITY: this route is public and fetches `downloadLocation` WITH the
// Unsplash key attached, so we only ever call Unsplash's own host. Without this
// check an attacker could POST any URL and receive the key (SSRF + key leak).
export async function POST(req: NextRequest) {
  try {
    const { downloadLocation } = await req.json();
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!downloadLocation || !key) return NextResponse.json({ ok: true });

    let url: URL;
    try {
      url = new URL(String(downloadLocation));
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid URL." }, { status: 400 });
    }
    // Only Unsplash's API host is allowed as a download-tracking target.
    if (url.protocol !== "https:" || url.hostname !== "api.unsplash.com") {
      return NextResponse.json({ ok: false, error: "Disallowed host." }, { status: 400 });
    }

    await fetch(url.toString(), { headers: { Authorization: `Client-ID ${key}` }, cache: "no-store" });
  } catch {
    // best-effort; never surface internals
  }
  return NextResponse.json({ ok: true });
}
