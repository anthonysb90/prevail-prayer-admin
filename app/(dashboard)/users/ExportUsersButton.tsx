"use client";

import { useTransition, useState } from "react";
import { Download } from "lucide-react";
import { exportUsersCsv } from "./actions";

export function ExportUsersButton({ q }: { q: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await exportUsersCsv(q);
      if (res.error || !res.csv) { setError(res.error ?? "Export failed."); return; }
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prevail-users-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-2 border border-line bg-white hover:border-brand hover:text-brand text-tone-muted text-sm font-semibold px-4 py-2.5 rounded-card transition-colors disabled:opacity-50"
      >
        <Download size={16} /> {pending ? "Exporting…" : "Export CSV"}
      </button>
      {error && <span className="text-xs text-red-600 mt-1">{error}</span>}
    </div>
  );
}
