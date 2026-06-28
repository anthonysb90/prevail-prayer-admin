"use client";

import { useState, useTransition } from "react";
import { updateFeedbackStatus } from "./actions";

export interface FeedbackRow {
  id: string;
  type: "bug" | "feature";
  message: string;
  email: string | null;
  display_name: string | null;
  app_version: string | null;
  platform: string | null;
  status: string;
  created_at: string;
}

const STATUSES = ["new", "planned", "in_progress", "done", "dismissed"] as const;
const STATUS_LABEL: Record<string, string> = {
  new: "New", planned: "Planned", in_progress: "In progress", done: "Done", dismissed: "Dismissed",
};
const STATUS_CLASS: Record<string, string> = {
  new: "bg-brand/10 text-brand",
  planned: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-500",
};

type TypeFilter = "all" | "bug" | "feature";
type StatusFilter = "all" | (typeof STATUSES)[number];

export function FeedbackList({ initialRows }: { initialRows: FeedbackRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible = rows.filter(
    (r) => (typeFilter === "all" || r.type === typeFilter) && (statusFilter === "all" || r.status === statusFilter)
  );

  const changeStatus = (id: string, status: string) => {
    setPendingId(id);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    startTransition(async () => {
      await updateFeedbackStatus(id, status);
      setPendingId(null);
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5">
        <Filter label="Type" value={typeFilter} onChange={(v) => setTypeFilter(v as TypeFilter)} options={[["all", "All"], ["bug", "Bugs"], ["feature", "Ideas"]]} />
        <Filter label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)} options={[["all", "All"], ...STATUSES.map((s) => [s, STATUS_LABEL[s]] as [string, string])]} />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-6 text-sm text-tone-muted">No feedback matches these filters.</div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.id} className="rounded-card border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${r.type === "bug" ? "bg-red-100 text-red-700" : "bg-violet-100 text-violet-700"}`}>
                    {r.type === "bug" ? "Bug" : "Idea"}
                  </span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_CLASS[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                <span className="text-xs text-tone-muted shrink-0">{new Date(r.created_at).toLocaleString()}</span>
              </div>

              <p className="text-sm text-tone mt-3 whitespace-pre-wrap">{r.message}</p>

              <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <div className="text-xs text-tone-muted">
                  {r.display_name || "Anonymous"}{r.email ? ` · ${r.email}` : ""}
                  {r.app_version ? ` · v${r.app_version}` : ""}{r.platform ? ` · ${r.platform}` : ""}
                </div>
                <label className="text-xs text-tone-muted flex items-center gap-2">
                  Status
                  <select
                    value={r.status}
                    disabled={pendingId === r.id}
                    onChange={(e) => changeStatus(r.id, e.target.value)}
                    className="rounded-md border border-line px-2 py-1.5 text-sm text-tone focus:outline-none focus:border-brand bg-white disabled:opacity-50"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="text-xs text-tone-muted flex items-center gap-2">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line px-2 py-1.5 text-sm text-tone focus:outline-none focus:border-brand bg-white"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}
