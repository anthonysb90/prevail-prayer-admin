import { getAiCostSummary, formatUsd } from "@/lib/anthropicCost";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AiCostsPage() {
  const c = await getAiCostSummary();

  const cards = [
    { label: "Today", value: c.periods.today },
    { label: "Last 7 days", value: c.periods.week },
    { label: "This month", value: c.periods.month },
    { label: "This quarter", value: c.periods.quarter },
    { label: "This year", value: c.periods.year },
  ];
  const maxDay = Math.max(0, ...c.daily.map((d) => d.amount));

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-tone">AI Costs</h1>
        <p className="text-sm text-tone-muted mt-1">
          Anthropic spend for the prayer-list AI features.{" "}
          {c.workspaceScoped
            ? "Scoped to your Prevail Prayer workspace, so other things on your account aren't counted."
            : "Counting all workspaces on the account — set ANTHROPIC_WORKSPACE_ID to scope this to just Prevail Prayer."}
        </p>
      </div>

      {!c.configured ? (
        <div className="rounded-card border border-line bg-white p-6 text-sm text-tone">
          <p className="font-medium mb-2">Not connected yet</p>
          <p className="text-tone-muted mb-3">
            Add an Anthropic <span className="font-mono">Admin API key</span> to see live spend. In Vercel → Project →
            Settings → Environment Variables, add:
          </p>
          <ul className="list-disc pl-5 text-tone-muted space-y-1">
            <li><span className="font-mono">ANTHROPIC_ADMIN_KEY</span> — your admin key (sk-ant-admin01-…), marked Sensitive</li>
            <li><span className="font-mono">ANTHROPIC_WORKSPACE_ID</span> — the workspace your app key lives in (wrkspc_…), to exclude everything else</li>
          </ul>
          <p className="text-tone-muted mt-3">Redeploy the admin after adding them.</p>
        </div>
      ) : c.error ? (
        <div className="rounded-card border border-red-200 bg-red-50 p-5 text-sm text-red-700">{c.error}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {cards.map((card) => (
              <div key={card.label} className="rounded-card bg-page p-4">
                <div className="text-xs text-tone-muted">{card.label}</div>
                <div className="text-2xl font-semibold text-tone mt-1">{formatUsd(card.value)}</div>
              </div>
            ))}
          </div>

          <div className="rounded-card border border-line bg-white p-5">
            <h2 className="text-sm font-semibold text-tone mb-4">By day · this month</h2>
            {c.daily.length === 0 ? (
              <p className="text-sm text-tone-muted">No AI spend recorded yet this month.</p>
            ) : (
              <div className="space-y-2">
                {c.daily.map((d) => (
                  <div key={d.date} className="flex items-center gap-3">
                    <span className="text-xs text-tone-muted w-16 shrink-0">{d.date.slice(5)}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-page overflow-hidden">
                      <div className="h-full bg-brand rounded-full" style={{ width: `${maxDay ? Math.max(3, (d.amount / maxDay) * 100) : 0}%` }} />
                    </div>
                    <span className="text-xs text-tone w-20 text-right shrink-0">{formatUsd(d.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-tone-muted mt-4">
            Figures are Anthropic's billed amounts (USD), updated within a few minutes of each call. Priority-tier usage,
            if any, isn't included by Anthropic's cost endpoint.
          </p>
        </>
      )}
    </div>
  );
}
