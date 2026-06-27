import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { subDays, format, eachDayOfInterval } from "date-fns";
import { SignupsLine, PlanPie, StateBar } from "@/components/ui/AnalyticsCharts";
import { ageFromBirthday } from "@/lib/age";
import { ExternalLink, TrendingUp, UserCheck, Cake } from "lucide-react";

export const dynamic = "force-dynamic";

const POSTHOG_URL = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_URL ?? "https://us.posthog.com";

export default async function AnalyticsPage() {
  const supabase = createAdminClient() ?? createClient();
  const since = subDays(new Date(), 29);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("created_at, subscription_status, birthday, last_active_at, last_prayer_date");

  const rows = profiles ?? [];

  // Signups per day (last 30 days)
  const days = eachDayOfInterval({ start: since, end: new Date() });
  const signupMap: Record<string, number> = {};
  for (const r of rows) {
    const d = r.created_at?.slice(0, 10);
    if (d) signupMap[d] = (signupMap[d] ?? 0) + 1;
  }
  const signups = days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return { date: format(d, "MMM d"), signups: signupMap[key] ?? 0 };
  });

  // Subscription breakdown
  const planCounts: Record<string, number> = {};
  for (const r of rows) {
    const k = r.subscription_status ?? "free";
    planCounts[k] = (planCounts[k] ?? 0) + 1;
  }
  const plans = Object.entries(planCounts).map(([name, value]) => ({ name, value }));

  // Conversion: paying (premium) / total
  const total = rows.length;
  const premium = planCounts["premium"] ?? 0;
  const trial = planCounts["trial"] ?? 0;
  const conversion = total ? Math.round((premium / total) * 100) : 0;

  // Active in last 7 days (proxy: last_active_at or last_prayer_date)
  const sevenAgo = subDays(new Date(), 7);
  const active7 = rows.filter((r) => {
    const t = r.last_active_at ?? r.last_prayer_date;
    return t && new Date(t) >= sevenAgo;
  }).length;

  // Age distribution (from birthday)
  const AGE_BUCKETS: { label: string; min: number; max: number }[] = [
    { label: "Under 18", min: 0, max: 17 },
    { label: "18–24", min: 18, max: 24 },
    { label: "25–34", min: 25, max: 34 },
    { label: "35–44", min: 35, max: 44 },
    { label: "45–54", min: 45, max: 54 },
    { label: "55–64", min: 55, max: 64 },
    { label: "65+", min: 65, max: 200 },
  ];
  const ageCounts: Record<string, number> = {};
  for (const r of rows) {
    const a = ageFromBirthday((r as any).birthday);
    if (a == null) continue;
    const bucket = AGE_BUCKETS.find((b) => a >= b.min && a <= b.max);
    if (bucket) ageCounts[bucket.label] = (ageCounts[bucket.label] ?? 0) + 1;
  }
  const ages = AGE_BUCKETS
    .filter((b) => ageCounts[b.label])
    .map((b) => ({ state: b.label, users: ageCounts[b.label] }));

  const kpis = [
    { label: "New signups (30d)", value: signups.reduce((s, d) => s + d.signups, 0), icon: TrendingUp },
    { label: "Active users (7d)", value: active7, icon: UserCheck },
    { label: "Trial users", value: trial, icon: UserCheck },
    { label: "Trial→Paid conversion", value: `${conversion}%`, icon: TrendingUp },
  ];

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-serif text-tone">Analytics</h1>
          <p className="text-tone-faint text-sm mt-1">Growth, conversion, and engagement</p>
        </div>
        <a href={POSTHOG_URL} target="_blank" rel="noreferrer"
           className="inline-flex items-center gap-2 px-4 py-2.5 rounded-card bg-ink text-white text-sm hover:opacity-90">
          Open live analytics in PostHog <ExternalLink size={15} />
        </a>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-card p-5 border border-line shadow-card">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-brand-soft text-brand">
              <Icon size={20} />
            </div>
            <p className="text-3xl font-serif text-tone">{typeof value === "number" ? value.toLocaleString() : value}</p>
            <p className="text-tone-faint text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-card p-6 border border-line shadow-card lg:col-span-2">
          <h2 className="font-serif text-lg text-tone mb-4">Signups — last 30 days</h2>
          <SignupsLine data={signups} />
        </div>
        <div className="bg-white rounded-card p-6 border border-line shadow-card">
          <h2 className="font-serif text-lg text-tone mb-4">Subscription breakdown</h2>
          <PlanPie data={plans} />
        </div>
        <div className="bg-white rounded-card p-6 border border-line shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Cake size={18} className="text-brand" />
            <h2 className="font-serif text-lg text-tone">Age distribution</h2>
          </div>
          {ages.length ? <StateBar data={ages} /> : <p className="text-sm text-tone-faint">No birthday data yet.</p>}
        </div>
      </div>
    </div>
  );
}
