"use client";

import { useState, useTransition } from "react";
import { notifyOutdated } from "./actions";

interface VersionCount {
  version: string;
  count: number;
}

export function VersionPanel({
  versions,
  unknown,
  totalDevices,
  latest,
}: {
  versions: VersionCount[];
  unknown: number;
  totalDevices: number;
  latest: string;
}) {
  const [latestInput, setLatestInput] = useState(latest);
  const [title, setTitle] = useState("Update available");
  const [body, setBody] = useState("A new version of Prevail Prayer is ready. Update from the App Store or Google Play to get the latest features and fixes.");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const outdated = versions
    .filter((v) => v.version !== latestInput.trim())
    .reduce((sum, v) => sum + v.count, 0) + unknown;

  const max = Math.max(1, ...versions.map((v) => v.count), unknown);

  const send = () => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await notifyOutdated(latestInput, title, body);
      if (res.error) setError(res.error);
      else setResult(res.sent ?? 0);
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-line bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-tone">Version distribution</h2>
          <span className="text-xs text-tone-muted">{totalDevices} device{totalDevices === 1 ? "" : "s"}</span>
        </div>
        {versions.length === 0 && unknown === 0 ? (
          <p className="text-sm text-tone-muted">No device versions reported yet.</p>
        ) : (
          <div className="space-y-2.5">
            {versions.map((v) => (
              <div key={v.version} className="flex items-center gap-3">
                <span className="text-xs font-mono w-20 shrink-0 text-tone">
                  {v.version}
                  {v.version === latestInput.trim() ? <span className="ml-1 text-green-600">●</span> : null}
                </span>
                <div className="flex-1 h-2.5 rounded-full bg-page overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${Math.max(3, (v.count / max) * 100)}%` }} />
                </div>
                <span className="text-xs text-tone-muted w-28 text-right shrink-0">
                  {v.count} · {totalDevices ? Math.round((v.count / totalDevices) * 100) : 0}%
                </span>
              </div>
            ))}
            {unknown > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono w-20 shrink-0 text-tone-muted">unknown</span>
                <div className="flex-1 h-2.5 rounded-full bg-page overflow-hidden">
                  <div className="h-full bg-tone-muted rounded-full" style={{ width: `${Math.max(3, (unknown / max) * 100)}%` }} />
                </div>
                <span className="text-xs text-tone-muted w-28 text-right shrink-0">{unknown} · pre-update</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-card border border-line bg-white p-5">
        <h2 className="text-sm font-semibold text-tone mb-1">Nudge outdated users</h2>
        <p className="text-xs text-tone-muted mb-4">
          Sends a push to every device not on the version below. <span className="font-medium text-tone">{outdated}</span> device{outdated === 1 ? "" : "s"} will be notified.
        </p>

        <label className="block text-xs font-medium text-tone-muted mb-1">Latest version</label>
        <input
          value={latestInput}
          onChange={(e) => setLatestInput(e.target.value)}
          placeholder="1.1.0"
          className="w-40 rounded-md border border-line px-3 py-2 text-sm text-tone font-mono focus:outline-none focus:border-brand mb-4"
        />

        <label className="block text-xs font-medium text-tone-muted mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-line px-3 py-2 text-sm text-tone focus:outline-none focus:border-brand mb-4"
        />

        <label className="block text-xs font-medium text-tone-muted mb-1">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-line px-3 py-2 text-sm text-tone focus:outline-none focus:border-brand resize-none mb-4"
        />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {result !== null && <p className="text-sm text-green-700 mb-3">Sent to {result} device{result === 1 ? "" : "s"}.</p>}

        <button
          type="button"
          onClick={send}
          disabled={pending || outdated === 0 || !latestInput.trim()}
          className="text-sm px-4 py-2 rounded-full bg-brand text-white disabled:opacity-40"
        >
          {pending ? "Sending…" : `Send update nudge to ${outdated} device${outdated === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
