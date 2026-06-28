import { getAiCostSummary, getModelPrices, getAiModelSettings, formatUsd } from "@/lib/anthropicCost";
import { PriceEditor } from "./PriceEditor";
import { ModelSettings } from "./ModelSettings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AiCostsPage() {
  const [c, prices, models] = await Promise.all([getAiCostSummary(), getModelPrices(), getAiModelSettings()]);

  const periodRow = (p: typeof c.periods) => [
    { label: "Today", value: p.today },
    { label: "Last 7 days", value: p.week },
    { label: "This month", value: p.month },
    { label: "This quarter", value: p.quarter },
    { label: "This year", value: p.year },
  ];
  const cards = periodRow(c.periods);
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
          <div className="text-xs font-semibold text-tone-muted uppercase tracking-wide mb-2">All providers</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {cards.map((card) => (
              <div key={card.label} className="rounded-card bg-page p-4">
                <div className="text-xs text-tone-muted">{card.label}</div>
                <div className="text-2xl font-semibold text-tone mt-1">{formatUsd(card.value)}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <ProviderCard title="Claude (Anthropic)" periods={periodRow(c.byProvider.anthropic)} />
            <ProviderCard title="Gemini (Google)" periods={periodRow(c.byProvider.gemini)} />
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

          <ModelSettings settings={models} prices={prices} />

          <PriceEditor prices={prices} />

          <p className="text-xs text-tone-muted mt-4">
            Figures are estimated from token counts at your editable per-model prices, split by provider from the model used.
            They&apos;re typically within a cent or two of each provider&apos;s billed total — cross-check on the Anthropic Console
            and Google Cloud Billing.
          </p>
        </>
      )}
    </div>
  );
}

function ProviderCard({ title, periods }: { title: string; periods: { label: string; value: number }[] }) {
  const total = periods.find((p) => p.label === "This year")?.value ?? 0;
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-tone">{title}</h3>
        <span className="text-xs text-tone-muted">{formatUsd(total)} this year</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {periods.slice(0, 3).map((p) => (
          <div key={p.label} className="rounded-md bg-page p-3">
            <div className="text-[11px] text-tone-muted">{p.label}</div>
            <div className="text-lg font-semibold text-tone mt-0.5">{formatUsd(p.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
