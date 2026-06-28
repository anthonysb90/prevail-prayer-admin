import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Self-tracked AI cost for the admin "AI Costs" page. The import edge function
 * logs each call's tokens + computed cost into ai_cost_log (priced from the
 * editable ai_model_prices table). No Anthropic admin key required.
 */

export interface Periods {
  today: number;
  week: number;
  month: number;
  quarter: number;
  year: number;
}

export interface AiCostSummary {
  configured: boolean;
  periods: Periods; // combined (all providers)
  byProvider: { anthropic: Periods; gemini: Periods };
  daily: { date: string; amount: number }[];
}

export interface ModelPrice {
  model: string;
  label: string | null;
  input_per_mtok: number;
  output_per_mtok: number;
}

const emptyPeriods = (): Periods => ({ today: 0, week: 0, month: 0, quarter: 0, year: 0 });

export async function getAiCostSummary(): Promise<AiCostSummary> {
  const admin = createAdminClient();
  if (!admin) {
    return { configured: false, periods: emptyPeriods(), byProvider: { anthropic: emptyPeriods(), gemini: emptyPeriods() }, daily: [] };
  }

  const since = new Date(Date.now() - 372 * 86400000).toISOString();
  const { data } = await admin.from("ai_cost_log").select("cost_usd, model, created_at").gte("created_at", since);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const q = Math.floor(mo / 3);
  const weekAgo = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);

  const p = emptyPeriods();
  const anthropic = emptyPeriods();
  const gemini = emptyPeriods();
  const byDay = new Map<string, number>();

  const add = (bucket: Periods, day: string, d: Date, cost: number) => {
    if (day === todayStr) bucket.today += cost;
    if (day >= weekAgo) bucket.week += cost;
    if (d.getUTCFullYear() === y && d.getUTCMonth() === mo) bucket.month += cost;
    if (d.getUTCFullYear() === y && Math.floor(d.getUTCMonth() / 3) === q) bucket.quarter += cost;
    if (d.getUTCFullYear() === y) bucket.year += cost;
  };

  for (const row of data ?? []) {
    const day = String((row as { created_at: string }).created_at).slice(0, 10);
    const cost = Number((row as { cost_usd: string | number }).cost_usd) || 0;
    const model = String((row as { model: string | null }).model ?? "");
    const d = new Date(`${day}T00:00:00Z`);
    add(p, day, d, cost);
    add(providerForModel(model) === "gemini" ? gemini : anthropic, day, d, cost);
    if (d.getUTCFullYear() === y && d.getUTCMonth() === mo) byDay.set(day, (byDay.get(day) ?? 0) + cost);
  }

  const daily = Array.from(byDay.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { configured: true, periods: p, byProvider: { anthropic, gemini }, daily };
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

export interface AiModelSettings {
  vision_provider: string;
  vision_model: string;
  text_provider: string;
  text_model: string;
}

// Defaults mirror the edge function's fallbacks so the admin UI shows the same
// models the import function uses before any row is saved.
const DEFAULT_MODELS: AiModelSettings = {
  vision_provider: "anthropic",
  vision_model: "claude-sonnet-4-6",
  text_provider: "anthropic",
  text_model: "claude-haiku-4-5-20251001",
};

export async function getAiModelSettings(): Promise<AiModelSettings> {
  const admin = createAdminClient();
  if (!admin) return DEFAULT_MODELS;
  const { data } = await admin
    .from("ai_settings")
    .select("vision_provider, vision_model, text_provider, text_model")
    .limit(1)
    .maybeSingle();
  return {
    vision_provider: (data?.vision_provider as string | undefined)?.trim() || DEFAULT_MODELS.vision_provider,
    vision_model: (data?.vision_model as string | undefined)?.trim() || DEFAULT_MODELS.vision_model,
    text_provider: (data?.text_provider as string | undefined)?.trim() || DEFAULT_MODELS.text_provider,
    text_model: (data?.text_model as string | undefined)?.trim() || DEFAULT_MODELS.text_model,
  };
}

// Provider is inferred from the model id so the admin only needs to pick a model.
export function providerForModel(model: string): "anthropic" | "gemini" {
  return model.trim().toLowerCase().startsWith("gemini") ? "gemini" : "anthropic";
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}
