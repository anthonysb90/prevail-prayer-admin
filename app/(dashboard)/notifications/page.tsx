"use client";
import { useState, useEffect } from "react";
import { Send, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

type NotifType = "info" | "prayer" | "emergency" | "update";

const TYPE_OPTIONS: { value: NotifType; label: string; color: string }[] = [
  { value: "info",      label: "Announcement", color: "border-blue-400 bg-blue-50 text-blue-700" },
  { value: "prayer",    label: "Prayer Need",  color: "border-purple-400 bg-purple-50 text-purple-700" },
  { value: "emergency", label: "Emergency",    color: "border-red-400 bg-red-50 text-red-700" },
  { value: "update",    label: "App Update",   color: "border-green-400 bg-green-50 text-green-700" },
];

interface Announcement { id: string; title: string; body: string; type: string; sent_at: string | null }

export default function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NotifType>("info");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Announcement[]>([]);
  const [tokenCount, setTokenCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("announcements").select("*").not("sent_at", "is", null).order("sent_at", { ascending: false }).limit(20)
      .then(({ data }) => setHistory(data ?? []));
    supabase.from("user_push_tokens").select("user_id", { count: "exact", head: true })
      .then(({ count }) => setTokenCount(count ?? 0));
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { alert("Title and body required."); return; }
    setSending(true);
    const supabase = createClient();

    // 1. Save announcement record
    const { data: announcement, error } = await supabase
      .from("announcements")
      .insert({ title: title.trim(), body: body.trim(), type, sent_at: new Date().toISOString() })
      .select().single();

    if (error) { alert(error.message); setSending(false); return; }

    // 2. Fetch all push tokens
    const { data: tokens } = await supabase.from("user_push_tokens").select("expo_push_token");
    const pushTokens = tokens?.map((t) => t.expo_push_token) ?? [];

    // 3. Send via Expo Push API in batches of 100
    if (pushTokens.length > 0) {
      const batches = [];
      for (let i = 0; i < pushTokens.length; i += 100) {
        batches.push(pushTokens.slice(i, i + 100));
      }
      await Promise.all(
        batches.map((batch) =>
          fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(
              batch.map((token) => ({
                to: token,
                title: title.trim(),
                body: body.trim(),
                data: { screen: "/notifications", type },
                sound: "default",
              }))
            ),
          })
        )
      );
    }

    setHistory((h) => [announcement, ...h]);
    setTitle("");
    setBody("");
    setSending(false);
    alert(`Sent to ${pushTokens.length} devices.`);
  };

  const inputClass = "w-full bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-900">Push Notifications</h1>
        <p className="text-charcoal-400 text-sm mt-1">{tokenCount.toLocaleString()} registered devices</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Compose */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-charcoal-900 mb-5">Compose Notification</h2>
          <div className="space-y-4">
            {/* Type picker */}
            <div>
              <label className="block text-xs font-medium text-charcoal-400 mb-2 uppercase tracking-wide">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value} onClick={() => setType(opt.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${
                      type === opt.value ? opt.color : "border-cream-200 bg-cream-50 text-charcoal-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-charcoal-400 mb-1">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Notification title" maxLength={65} />
              <p className="text-xs text-charcoal-400 mt-1 text-right">{title.length}/65</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-charcoal-400 mb-1">Message</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={inputClass} placeholder="Notification message..." maxLength={240} />
              <p className="text-xs text-charcoal-400 mt-1 text-right">{body.length}/240</p>
            </div>
            <button
              onClick={handleSend} disabled={sending || !title.trim() || !body.trim()}
              className="w-full flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              <Send size={16} /> {sending ? "Sending..." : `Send to All (${tokenCount})`}
            </button>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-charcoal-900 mb-5">Send History</h2>
          {history.length === 0 ? (
            <div className="text-center py-8 text-charcoal-400">
              <Bell size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No notifications sent yet.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.map((n) => (
                <div key={n.id} className="p-3 bg-cream-50 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-charcoal-900">{n.title}</span>
                    <span className="text-xs text-charcoal-400">{n.sent_at ? format(new Date(n.sent_at), "MMM d") : ""}</span>
                  </div>
                  <p className="text-xs text-charcoal-400 line-clamp-2">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
