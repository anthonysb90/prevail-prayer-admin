// Shown while a dashboard page's server data is loading. Keeps navigation from
// feeling dead on these query-heavy, force-dynamic pages.
export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-52 rounded-lg bg-line" />
        <div className="mt-2 h-4 w-72 rounded bg-line/70" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-card p-5 border border-line shadow-card">
            <div className="w-10 h-10 rounded-xl bg-line mb-4" />
            <div className="h-7 w-20 rounded bg-line" />
            <div className="mt-2 h-3 w-24 rounded bg-line/70" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-card p-6 border border-line shadow-card">
        <div className="h-5 w-40 rounded bg-line mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-full rounded bg-line/70" />
          ))}
        </div>
      </div>
    </div>
  );
}
