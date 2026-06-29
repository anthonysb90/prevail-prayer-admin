"use client";

import { useState, useEffect } from "react";
import { Send, Bell, Clock, X, Users } from "lucide-react";
import { format } from "date-fns";
import { SEGMENTS, type NotifData } from "@/lib/notify";
import { getNotifData, sendToSegment, scheduleToSegment, cancelScheduled } from "./actions";

type NotifType = "info" | "prayer" | "emergency" | "update";
const TYPE_OPTIONS: { value: NotifType; label: string; color: string }[] = [
  { value: "info", label: "Announcement", color: "border-blue-400 bg-blue-50 text-blue-700" },
  { value: "prayer", label: "Prayer Need", color: "border-purple-400 bg-purple-50 text-purple-700" },
  { value: "emergency", label: "Emergency", color: "border-red-400 bg-red-50 text-red-700" },
  { value: "update", label: "App Update", color: "border-green-400 bg-green-50 text-green-700" },
];

const inputClass = "w-full bg-white border border-line rounded-xl px-4 py-3 text-tone focus:outline-none focus:ring-2 focus:ring-brand text-sm";

function defaultSchedule() {
  const d = new Date(Date.now() + 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NotifType>("info");
  const [segment, setSegment] = useState("all");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [scheduleAt, setScheduleAt] = useState(defaultSchedule());
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<NotifData>({ counts: {}, totalUsers: 0, reachableUsers: 0, history: [], scheduled: [] });
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const refresh = () => getNotifData().then(setData);
  useEffect(() => { refresh(); }, []);

  const count = data.counts[segment] ?? 0;
  const segLabel = SEGMENTS.find((s) => s.value === segment)?.label ?? segment;

  const send = () => {
    if (!title.trim() || !body.trim()) { setMsg({ kind: "err", text: "Title and message are required." }); return; }
    setBusy(true); setMsg(null);
    (async () => {
      if (mode === "now") {
        const res = await sendToSegment(title, body, type, segment);
        if (res.error) setMsg({ kind: "err", text: res.error });
        else { setMsg({ kind: "ok", text: `Sent to ${res.sent ?? 0} device${res.sent === 1 ? "" : "s"}.` }); setTitle(""); setBody(""); refresh(); }
      } else {
        const res = await scheduleToSegment(title, body, type, segment, new Date(scheduleAt).toISOString());
        if (res.error) setMsg({ kind: "err", text: res.error });
        else { setMsg({ kind: "ok", text: "Scheduled." }); setTitle(""); setBody(""); refresh(); }
      }
      setBusy(false);
    })();
  };

  const cancel = (id: string) => { cancelScheduled(id).then((r) => { if (!r.error) refresh(); }); };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-tone">Push Notifications</h1>
        <p className="text-tone-faint text-sm mt-1">
          {data.reachableUsers} of {data.totalUsers} users reachable
          {data.totalUsers > data.reachableUsers
            ? ` — ${data.totalUsers - data.reachableUsers} haven't turned on notifications`
            : ""}
        </p>
      </div>

      {msg && (
        <div className={`mb-4 text-sm rounded-xl px-4 py-3 ${msg.kind === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Compose */}
        <div className="bg-white rounded-card p-6 shadow-card space-y-4">
          <h2 className="font-semibold text-tone">Compose</h2>

          <div>
            <label className="block text-xs font-medium text-tone-faint mb-2 uppercase tracking-wide">Audience</label>
            <select value={segment} onChange={(e) => setSegment(e.target.value)} className={inputClass}>
              {SEGMENTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label} — {data.counts[s.value] ?? 0} recipients</option>
              ))}
            </select>
            <p className="text-xs text-tone-faint mt-1">{SEGMENTS.find((s) => s.value === segment)?.description}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-tone-faint mb-2 uppercase tracking-wide">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setType(opt.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-colors ${type === opt.value ? opt.color : "border-line bg-white text-tone-faint"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-tone-faint mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Notification title" maxLength={65} />
          </div>
          <div>
            <label className="block text-xs font-medium text-tone-faint mb-1">Message</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={inputClass} placeholder="Notification message…" maxLength={240} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode("now")} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${mode === "now" ? "border-brand bg-brand-soft text-brand-deep" : "border-line text-tone-faint"}`}>Send now</button>
            <button onClick={() => setMode("schedule")} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${mode === "schedule" ? "border-brand bg-brand-soft text-brand-deep" : "border-line text-tone-faint"}`}>Schedule</button>
          </div>
          {mode === "schedule" && (
            <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className={inputClass} />
          )}

          <button onClick={send} disabled={busy || !title.trim() || !body.trim()}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-deep text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60">
            {mode === "now" ? <Send size={16} /> : <Clock size={16} />}
            {busy ? "Working…" : mode === "now" ? `Send to ${segLabel} (${count})` : `Schedule for ${segLabel} (${count})`}
          </button>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {data.scheduled.length > 0 && (
            <div className="bg-white rounded-card p-6 shadow-card">
              <h2 className="font-semibold text-tone mb-4 flex items-center gap-2"><Clock size={16} className="text-brand" /> Scheduled</h2>
              <div className="space-y-2">
                {data.scheduled.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-page">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-tone truncate">{s.title}</p>
                      <p className="text-xs text-tone-faint">{SEGMENTS.find((x) => x.value === s.segment)?.label ?? s.segment} · {format(new Date(s.send_at), "MMM d, h:mm a")}</p>
                    </div>
                    <button onClick={() => cancel(s.id)} className="text-tone-faint hover:text-red-500 shrink-0" title="Cancel"><X size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-card p-6 shadow-card">
            <h2 className="font-semibold text-tone mb-4 flex items-center gap-2"><Bell size={16} className="text-brand" /> Send history</h2>
            {data.history.length === 0 ? (
              <div className="text-center py-8 text-tone-faint">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No sends yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {data.history.map((n) => (
                  <div key={n.id} className="p-3 rounded-xl bg-page">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="font-semibold text-sm text-tone truncate">{n.title}</span>
                      <span className="text-xs text-tone-faint shrink-0">{format(new Date(n.created_at), "MMM d")}</span>
                    </div>
                    <p className="text-xs text-tone-faint line-clamp-2">{n.body}</p>
                    <p className="text-[11px] text-tone-faint mt-1">
                      {SEGMENTS.find((x) => x.value === n.segment)?.label ?? n.segment ?? "Everyone"} · {n.sent_count} sent
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
