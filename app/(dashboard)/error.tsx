"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

// Catches any error thrown while rendering a dashboard page and shows a friendly
// retry instead of an unstyled crash.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the browser console / error tracker without leaking to the UI.
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto mt-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-5">
        <AlertTriangle size={26} />
      </div>
      <h1 className="text-2xl font-serif text-tone mb-2">Something went wrong</h1>
      <p className="text-sm text-tone-muted mb-6">
        This page couldn&apos;t load. It&apos;s usually a brief hiccup reaching the database. Try again in a moment.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 bg-brand hover:bg-brand-deep text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-colors"
      >
        <RotateCcw size={16} /> Try again
      </button>
    </div>
  );
}
