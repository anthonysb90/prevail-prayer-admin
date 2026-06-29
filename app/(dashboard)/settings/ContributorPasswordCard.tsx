"use client";

import { useState, useEffect, useTransition } from "react";
import { PenLine, Copy, Check } from "lucide-react";
import { getContributorPasswordStatus, setContributorPassword } from "./actions";

export default function ContributorPasswordCard() {
  const [status, setStatus] = useState<{ set: boolean; source: "admin" | "env" | "none" } | null>(null);
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("/contribute");

  useEffect(() => {
    getContributorPasswordStatus().then((s) => setStatus({ set: s.set, source: s.source }));
    if (typeof window !== "undefined") setUrl(`${window.location.origin}/contribute`);
  }, []);

  const save = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await setContributorPassword(password);
      if (res.error) setMsg({ kind: "err", text: res.error });
      else {
        setMsg({ kind: "ok", text: "Password saved. Share the link and password with your writer." });
        setPassword("");
        setStatus({ set: true, source: "admin" });
      }
    });
  };

  const copy = () => {
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }, () => {});
  };

  const statusText = !status ? "…" :
    status.source === "admin" ? "Password is set" :
    status.source === "env" ? "Using env fallback (set one here to override)" :
    "No password set yet — set one to enable the page";

  return (
    <div id="submissions" className="bg-white rounded-card p-6 border border-line shadow-card scroll-mt-24">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
          <PenLine size={20} />
        </div>
        <h2 className="font-serif text-lg text-tone">Devotion Submissions</h2>
      </div>

      <p className="text-sm text-tone-muted leading-relaxed">
        Share this link and password with anyone you want to write devotions. Their submissions arrive as
        <span className="font-semibold text-tone"> unpublished drafts</span> — nothing goes live until you approve it.
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-page p-3">
        <code className="text-xs text-tone-muted flex-1 truncate">{url}</code>
        <button onClick={copy} className="text-tone-faint hover:text-brand shrink-0" title="Copy link">
          {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
        </button>
      </div>

      <div className="mt-5">
        <label className="block text-xs font-semibold text-tone-faint uppercase tracking-wider mb-1">
          {status?.set ? "Change password" : "Set password"}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min 6)"
            className="flex-1 bg-white border border-line rounded-xl px-3 py-2 text-tone text-sm outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            onClick={save}
            disabled={pending || password.length < 6}
            className="bg-brand hover:bg-brand-deep text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
        <p className="text-xs text-tone-faint mt-2">{statusText}</p>
      </div>

      {msg && (
        <div className={`mt-3 text-sm rounded-xl px-3 py-2 ${msg.kind === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
