import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Self-tracked AI cost for the admin "AI Costs" page. The import edge function
 * logs each call's tokens + computed cost into ai_cost_log (priced from the
 * editable ai_model_prices table). No Anthropic admin key required.
 */

export interface AiCostSummary {
  configured: boolean;
  periods: { today: number; week: number; month: number; quarter: number; year: number };
  daily: { date: string; amount: number }[];
}

export interface ModelPrice {
  model: string;
  label: string | null;
  input_per_mtok: number;
  output_per_mtok: number;
}

const EMPTY = { today: 0, week: 0, month: 0, quarter: 0, year: 0 };

export async function getAiCostSummary(): Promise<AiCostSummary> {
  const admin = createAdminClient();
  if (!admin) return { configured: false, periods: EMPTY, daily: [] };

  const since = new Date(Date.now() - 372 * 86400000).toISOString();
  const { data } = await admin.from("ai_cost_log").select("cost_usd, created_at").gte("created_at", since);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const q = Math.floor(mo / 3);
  const weekAgo = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);

  const p = { today: 0, week: 0, month: 0, quarter: 0, year: 0 };
  const byDay = new Map<string, number>();
  for (const row of data ?? []) {
    const day = String((row as { created_at: string }).created_at).slice(0, 10);
    const cost = Number((row as { cost_usd: string | number }).cost_usd) || 0;
    const d = new Date(`${day}T00:00:00Z`);
    if (day === todayStr) p.today += cost;
    if (day >= weekAgo) p.week += cost;
    if (d.getUTCFullYear() === y && d.getUTCMonth() === mo) {
      p.month += cost;
      byDay.set(day, (byDay.get(day) ?? 0) + cost);
    }
    if (d.getUTCFullYear() === y && Math.floor(d.getUTCMonth() / 3) === q) p.quarter += cost;
    if (d.getUTCFullYear() === y) p.year += cost;
  }

  const daily = Array.from(byDay.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { configured: true, periods: p, daily };
}

export async function getModelPrices(): Promise<ModelPrice[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("ai_model_prices").select("model, label, input_per_mtok, output_per_mtok").order("model");
  return (data ?? []).map((r: ModelPrice) => ({
    model: r.model,
    label: r.label,
    input_per_mtok: Number(r.input_per_mtok),
    output_per_mtok: Number(r.output_per_mtok),
  }));
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}
