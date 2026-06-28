import { getAiCostSummary, getModelPrices, formatUsd } from "@/lib/anthropicCost";
import { PriceEditor } from "./PriceEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AiCostsPage() {
  const [c, prices] = await Promise.all([getAiCostSummary(), getModelPrices()]);

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
          Anthropic spend for the prayer-list AI import. Tracked from each call&apos;s token usage and your model prices —
          only this app&apos;s key is counted.
        </p>
      </div>

      {!c.configured ? (
        <div className="rounded-card border border-line bg-white p-6 text-sm text-tone-muted">
          Service role key isn&apos;t configured, so cost data can&apos;t be read. Add SUPABASE_SERVICE_ROLE_KEY to the admin
          environment.
        </div>
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

          <div className="rounded-card border border-line bg-white p-5 mb-6">
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

          <PriceEditor prices={prices} />

          <p className="text-xs text-tone-muted mt-4">
            These are estimates from token counts, typically within a cent or two of Anthropic&apos;s billed total. Cross-check
            anytime on the Console&apos;s Cost page. (A live reconciliation to Anthropic&apos;s exact billing needs a team-org admin key.)
          </p>
        </>
      )}
    </div>
  );
}
