"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Download, Check, Minus } from "lucide-react";

export interface EngagementRow {
  id: string;
  name: string;
  plan: string;
  push: boolean;
  prayers: number;
  journals: number;
  devotions: number;
  scriptures: number;
  sessions: number;
  ai: number;
  streak: number;
  lastActive: string | null;
  joined: string;
}

type SortKey = keyof Pick<
  EngagementRow,
  "name" | "plan" | "prayers" | "journals" | "devotions" | "scriptures" | "sessions" | "ai" | "streak" | "lastActive" | "joined"
>;

const COLS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Member" },
  { key: "plan", label: "Plan" },
  { key: "prayers", label: "Prayers", numeric: true },
  { key: "journals", label: "Journals", numeric: true },
  { key: "devotions", label: "Devotions", numeric: true },
  { key: "scriptures", label: "Scripture", numeric: true },
  { key: "sessions", label: "Timer", numeric: true },
  { key: "ai", label: "AI imports", numeric: true },
  { key: "streak", label: "Streak", numeric: true },
  { key: "lastActive", label: "Last active" },
  { key: "joined", label: "Joined" },
];

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function EngagementTable({ rows }: { rows: EngagementRow[] }) {
  const [sort, setSort] = useState<SortKey>("lastActive");
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sort] ?? "";
      const bv = b[sort] ?? "";
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return asc ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, asc]);

  const toggle = (k: SortKey) => {
    if (k === sort) setAsc((v) => !v);
    else { setSort(k); setAsc(false); }
  };

  const totals = useMemo(() => ({
    members: rows.length,
    push: rows.filter((r) => r.push).length,
    devotionReaders: rows.filter((r) => r.devotions > 0).length,
    journalers: rows.filter((r) => r.journals > 0).length,
    scriptureUsers: rows.filter((r) => r.scriptures > 0).length,
    aiUsers: rows.filter((r) => r.ai > 0).length,
  }), [rows]);

  const downloadCsv = () => {
    const header = ["Member", "Plan", "Push", "Prayers", "Journals", "Devotions", "Scripture", "Timer", "AI imports", "Streak", "Last active", "Joined"];
    const lines = sorted.map((r) =>
      [r.name, r.plan, r.push ? "yes" : "no", r.prayers, r.journals, r.devotions, r.scriptures, r.sessions, r.ai, r.streak, fmtDate(r.lastActive), fmtDate(r.joined)]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "member-engagement.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <Stat label="Members" value={totals.members} />
        <Stat label="Push on" value={`${totals.push}/${totals.members}`} />
        <Stat label="Read devotions" value={totals.devotionReaders} />
        <Stat label="Journaling" value={totals.journalers} />
        <Stat label="Used Scripture" value={totals.scriptureUsers} />
        <Stat label="Used AI" value={totals.aiUsers} />
      </div>

      <div className="flex justify-end mb-2">
        <button onClick={downloadCsv} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-line text-tone-muted hover:bg-page transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-card shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line">
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className={`px-3 py-3 font-semibold text-tone-faint whitespace-nowrap ${c.numeric ? "text-right" : "text-left"}`}>
                  <button onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 hover:text-brand">
                    {c.label}<ArrowUpDown size={11} className={sort === c.key ? "text-brand" : "opacity-40"} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((r) => (
              <tr key={r.id} className="hover:bg-page transition-colors">
                <td className="px-3 py-3 font-medium text-tone whitespace-nowrap">{r.name}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    r.plan.startsWith("Pro") || r.plan === "premium" ? "bg-green-100 text-green-700"
                      : r.plan === "trial" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{r.plan}</span>
                </td>
                <Num v={r.prayers} /><Num v={r.journals} /><Num v={r.devotions} /><Num v={r.scriptures} /><Num v={r.sessions} /><Num v={r.ai} /><Num v={r.streak} />
                <td className="px-3 py-3 text-tone-faint whitespace-nowrap">{fmtDate(r.lastActive)}</td>
                <td className="px-3 py-3 text-tone-faint whitespace-nowrap">{fmtDate(r.joined)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={COLS.length} className="text-center py-12 text-tone-faint">No members yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-tone-faint mt-3">
        Push column reflects whether a device token is registered. The Timer column counts completed prayer sessions.
      </p>
    </div>
  );
}

function Num({ v }: { v: number }) {
  return <td className={`px-3 py-3 text-right tabular-nums ${v === 0 ? "text-tone-faint" : "text-tone"}`}>{v === 0 ? "—" : v}</td>;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-card border border-line p-3">
      <p className="text-lg font-semibold text-tone tabular-nums">{value}</p>
      <p className="text-xs text-tone-muted">{label}</p>
    </div>
  );
}
