"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Gift, Check, ChevronDown } from "lucide-react";
import { setCompAccess, endTrial } from "./actions";

type GiftPlan = "trial" | "month" | "year" | "lifetime" | "revoke";

interface Props {
  userId: string;
  comped: boolean;
}

/**
 * Per-user "Gift Pro" control. Lets an admin comp a user a month, year, or
 * lifetime of Pro, or revoke an existing gift. Writes via the server action.
 */
export function GiftProMenu({ userId, comped }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const choose = (plan: GiftPlan) => {
    setError(null);
    startTransition(async () => {
      const res = await setCompAccess(userId, plan);
      if (res.error) setError(res.error);
      else setOpen(false);
    });
  };

  const endTrialNow = () => {
    setError(null);
    startTransition(async () => {
      const res = await endTrial(userId);
      if (res.error) setError(res.error);
      else setOpen(false);
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
          comped
            ? "border-green-300 bg-green-50 text-green-700"
            : "border-line bg-white text-tone-muted hover:border-brand hover:text-brand"
        } disabled:opacity-50`}
      >
        {comped ? <Check size={13} /> : <Gift size={13} />}
        {pending ? "Saving…" : comped ? "Gifted Pro" : "Gift Pro"}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-card border border-line bg-white shadow-card py-1 text-sm">
          <button type="button" onClick={() => choose("trial")} className="w-full text-left px-3 py-2 hover:bg-page text-tone">
            Give 14-day trial
          </button>
          <button type="button" onClick={() => choose("month")} className="w-full text-left px-3 py-2 hover:bg-page text-tone">
            Gift 1 month
          </button>
          <button type="button" onClick={() => choose("year")} className="w-full text-left px-3 py-2 hover:bg-page text-tone">
            Gift 1 year
          </button>
          <button type="button" onClick={() => choose("lifetime")} className="w-full text-left px-3 py-2 hover:bg-page text-tone">
            Gift lifetime
          </button>
          {comped && (
            <button type="button" onClick={() => choose("revoke")} className="w-full text-left px-3 py-2 hover:bg-page text-red-600 border-t border-line">
              Revoke gift
            </button>
          )}
          <button type="button" onClick={endTrialNow} className="w-full text-left px-3 py-2 hover:bg-page text-red-600 border-t border-line" title="Clears app-granted access and marks the account expired. An active App Store trial/subscription is controlled by Apple and can't be cancelled here.">
            End trial / access
          </button>
        </div>
      )}

      {error && <p className="absolute right-0 mt-1 text-[11px] text-red-600 whitespace-nowrap">{error}</p>}
    </div>
  );
}
