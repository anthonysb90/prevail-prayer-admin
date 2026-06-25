import { NextResponse } from "next/server";

// Runs server-side (Node), so it can call Expo's push API without the CORS
// restriction that blocks the browser.
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { tokens, title, body, type } = await req.json();
    const list: string[] = (Array.isArray(tokens) ? tokens : []).filter(Boolean);
    if (!title || !body) {
      return NextResponse.json({ error: "Title and body required." }, { status: 400 });
    }
    if (list.length === 0) return NextResponse.json({ sent: 0 });

    const messages = list.map((to) => ({
      to,
      title,
      body,
      data: { screen: "/notifications", type },
      sound: "default",
    }));

    let sent = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(batch),
      });
      if (res.ok) sent += batch.length;
    }
    return NextResponse.json({ sent });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "send failed" }, { status: 500 });
  }
}
