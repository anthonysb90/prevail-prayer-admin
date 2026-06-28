/**
 * Anthropic AI cost tracking for the admin "AI Costs" page.
 *
 * Requires (set in Vercel, mark the key Sensitive):
 *   ANTHROPIC_ADMIN_KEY     Admin API key (sk-ant-admin01-...) — Console → Settings → Admin keys
 *   ANTHROPIC_WORKSPACE_ID  (optional) the workspace the Prevail Prayer key lives in
 *                           (wrkspc_...). When set, only that workspace's spend is counted,
 *                           so other things on your account are excluded. If omitted, all
 *                           workspaces are summed.
 *
 * Uses the Cost Report API (/v1/organizations/cost_report), grouped by workspace,
 * daily buckets. Amounts come back as decimal strings in cents.
 */

interface CostResult {
  amount?: string | number;
  currency?: string;
  workspace_id?: string | null;
}
interface CostBucket {
  starting_at?: string;
  results?: CostResult[];
}
interface CostResponse {
  data?: CostBucket[];
  has_more?: boolean;
  next_page?: string | null;
}

export interface AiCostSummary {
  configured: boolean;
  error?: string;
  workspaceScoped: boolean;
  periods: { today: number; week: number; month: number; quarter: number; year: number };
  daily: { date: string; amount: number }[]; // current-month days, dollars
}

const EMPTY = { today: 0, week: 0, month: 0, quarter: 0, year: 0 };

export async function getAiCostSummary(): Promise<AiCostSummary> {
  const key = process.env.ANTHROPIC_ADMIN_KEY;
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID || null;
  if (!key) return { configured: false, workspaceScoped: false, periods: EMPTY, daily: [] };

  const now = new Date();
  const start = new Date(now.getTime() - 372 * 86400000);
  const startISO = `${start.toISOString().slice(0, 10)}T00:00:00Z`;
  const endISO = `${new Date(now.getTime() + 86400000).toISOString().slice(0, 10)}T00:00:00Z`;

  const centsByDay = new Map<string, number>();
  try {
    let page: string | null = null;
    for (let i = 0; i < 20; i++) {
      const params = new URLSearchParams({ starting_at: startISO, ending_at: endISO, bucket_width: "1d", limit: "31" });
      params.append("group_by[]", "workspace_id");
      if (page) params.set("page", page);

      const res = await fetch(`https://api.anthropic.com/v1/organizations/cost_report?${params.toString()}`, {
        headers: { "anthropic-version": "2023-06-01", "x-api-key": key },
        cache: "no-store",
      });
      if (!res.ok) {
        const detail = res.status === 401 ? " Check the Admin API key." : "";
        return { configured: true, workspaceScoped: !!workspaceId, error: `Anthropic cost API error (${res.status}).${detail}`, periods: EMPTY, daily: [] };
      }
      const json = (await res.json()) as CostResponse;
      for (const bucket of json.data ?? []) {
        const day = (bucket.starting_at ?? "").slice(0, 10);
        if (!day) continue;
        for (const r of bucket.results ?? []) {
          if (workspaceId && (r.workspace_id ?? null) !== workspaceId) continue;
          const cents = typeof r.amount === "string" ? parseFloat(r.amount) : Number(r.amount ?? 0);
          if (!isNaN(cents)) centsByDay.set(day, (centsByDay.get(day) ?? 0) + cents);
        }
      }
      if (!json.has_more || !json.next_page) break;
      page = json.next_page;
    }
  } catch (e: unknown) {
    return { configured: true, workspaceScoped: !!workspaceId, error: e instanceof Error ? e.message : "Failed to reach Anthropic.", periods: EMPTY, daily: [] };
  }

  const todayStr = now.toISOString().slice(0, 10);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const q = Math.floor(m / 3);
  const weekAgo = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);

  const periodsCents = { today: 0, week: 0, month: 0, quarter: 0, year: 0 };
  const daily: { date: string; amount: number }[] = [];
  for (const [day, cents] of Array.from(centsByDay.entries())) {
    const d = new Date(`${day}T00:00:00Z`);
    if (day === todayStr) periodsCents.today += cents;
    if (day >= weekAgo) periodsCents.week += cents;
    if (d.getUTCFullYear() === y && d.getUTCMonth() === m) {
      periodsCents.month += cents;
      daily.push({ date: day, amount: cents / 100 });
    }
    if (d.getUTCFullYear() === y && Math.floor(d.getUTCMonth() / 3) === q) periodsCents.quarter += cents;
    if (d.getUTCFullYear() === y) periodsCents.year += cents;
  }
  daily.sort((a, b) => a.date.localeCompare(b.date));

  return {
    configured: true,
    workspaceScoped: !!workspaceId,
    periods: {
      today: periodsCents.today / 100,
      week: periodsCents.week / 100,
      month: periodsCents.month / 100,
      quarter: periodsCents.quarter / 100,
      year: periodsCents.year / 100,
    },
    daily,
  };
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}
