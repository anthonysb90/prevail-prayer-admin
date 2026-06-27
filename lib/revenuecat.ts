/**
 * RevenueCat live financials for the admin Analytics page.
 *
 * Requires (set in Vercel, mark the key Sensitive):
 *   REVENUECAT_API_KEY   v2 secret API key (sk_...) — Project settings → API keys → v2 secret
 *   REVENUECAT_PROJECT_ID  the project id (e.g. proj_... or the id in the dashboard URL)
 *
 * Uses the Overview Metrics endpoint, which returns MRR, active subscriptions,
 * active trials, revenue, new customers, and active users.
 */

export interface RcMetric {
  id: string;
  name: string;
  value: number;
  unit?: string | null;
}

export interface RcOverview {
  configured: boolean;
  error?: string;
  metrics?: Record<string, RcMetric>;
}

export async function getRevenueOverview(): Promise<RcOverview> {
  const key = process.env.REVENUECAT_API_KEY;
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  if (!key || !projectId) return { configured: false };

  try {
    const res = await fetch(`https://api.revenuecat.com/v2/projects/${projectId}/metrics/overview`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return { configured: true, error: `RevenueCat API error (${res.status}). Check the v2 secret key and project id.` };
    }
    const json = await res.json();
    const metrics: Record<string, RcMetric> = {};
    for (const m of json?.metrics ?? []) {
      metrics[m.id] = { id: m.id, name: m.name, value: Number(m.value ?? 0), unit: m.unit ?? null };
    }
    return { configured: true, metrics };
  } catch (e: unknown) {
    return { configured: true, error: e instanceof Error ? e.message : "Failed to reach RevenueCat." };
  }
}

/** Format a metric value, treating a currency unit as money. */
export function formatRcMetric(m?: RcMetric): string {
  if (!m) return "—";
  if (m.unit && /usd|eur|gbp|^[A-Z]{3}$/i.test(m.unit)) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: m.unit.toUpperCase() }).format(m.value);
    } catch {
      return `$${m.value.toLocaleString()}`;
    }
  }
  return m.value.toLocaleString();
}
