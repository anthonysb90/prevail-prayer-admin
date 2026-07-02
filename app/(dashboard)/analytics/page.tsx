import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { subDays, format, eachDayOfInterval } from "date-fns";
import { SignupsLine, PlanPie, StateBar } from "@/components/ui/AnalyticsCharts";
import { ageFromBirthday } from "@/lib/age";
import { getRevenueOverview, formatRcMetric } from "@/lib/revenuecat";
import { fetchAllRows } from "@/lib/paginate";
import { ExternalLink, TrendingUp, UserCheck, Cake, Flame, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

const POSTHOG_URL = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_URL ?? "https://us.posthog.com";

export default async function AnalyticsPage() {
  const supabase = createAdminClient() ?? createClient();
  const since = subDays(new Date(), 29);

  // Page through every profile (PostgREST caps a single query at 1,000 rows).
  const rows = await fetchAllRows<any>(
    supabase,
    "profiles",
    "created_at, subscription_status, birthday, prayer_streak, last_active_at, last_prayer_date",
  );
  const rc = await getRevenueOverview();

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
  const within = (days: number) => {
    const cut = subDays(new Date(), days);
    return rows.filter((r) => { const t = r.last_active_at ?? r.last_prayer_date; return t && new Date(t) >= cut; }).length;
  };
  const active1 = within(1);
  const active7 = within(7);
  const active30 = within(30);
  const churn = planCounts["expired"] ?? 0;

  // Prayer streak distribution
  const STREAK_BUCKETS = [
    { label: "0", min: 0, max: 0 },
    { label: "1–3", min: 1, max: 3 },
    { label: "4–6", min: 4, max: 6 },
    { label: "7–13", min: 7, max: 13 },
    { label: "14–29", min: 14, max: 29 },
    { label: "30+", min: 30, max: 1000000 },
  ];
  const streakCounts: Record<string, number> = {};
  for (const r of rows) {
    const s = (r as any).prayer_streak ?? 0;
    const b = STREAK_BUCKETS.find((x) => s >= x.min && s <= x.max);
    if (b) streakCounts[b.label] = (streakCounts[b.label] ?? 0) + 1;
  }
  const streaks = STREAK_BUCKETS.filter((b) => streakCounts[b.label]).map((b) => ({ state: b.label, users: streakCounts[b.label] }));

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
    { label: "Daily active (24h)", value: active1, icon: UserCheck },
    { label: "Weekly active (7d)", value: active7, icon: UserCheck },
    { label: "Monthly active (30d)", value: active30, icon: UserCheck },
    { label: "Trial users", value: trial, icon: UserCheck },
    { label: "Trial→Paid conversion", value: `${conversion}%`, icon: TrendingUp },
    { label: "Premium members", value: premium, icon: UserCheck },
    { label: "Expired (churn)", value: churn, icon: TrendingUp },
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

      {/* Revenue (RevenueCat) */}
      <div className="bg-white rounded-card p-6 border border-line shadow-card mb-8">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={18} className="text-brand" />
          <h2 className="font-serif text-lg text-tone">Revenue</h2>
          <span className="ml-auto text-xs text-tone-faint">via RevenueCat</span>
        </div>
        {!rc.configured ? (
          <p className="text-sm text-tone-faint">
            Set <code className="font-mono">REVENUECAT_API_KEY</code> (v2 secret) and <code className="font-mono">REVENUECAT_PROJECT_ID</code> in Vercel to show live MRR and subscriptions.
          </p>
        ) : rc.error ? (
          <p className="text-sm text-red-600">{rc.error}</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: "mrr", label: "MRR" },
              { id: "active_subscriptions", label: "Active subscriptions" },
              { id: "active_trials", label: "Active trials" },
              { id: "revenue", label: "Revenue (28d)" },
            ].map(({ id, label }) => (
              <div key={id}>
                <p className="text-2xl font-serif text-tone">{formatRcMetric(rc.metrics?.[id])}</p>
                <p className="text-tone-faint text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}
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
        <div className="bg-white rounded-card p-6 border border-line shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={18} className="text-brand" />
            <h2 className="font-serif text-lg text-tone">Prayer streak distribution</h2>
          </div>
          {streaks.length ? <StateBar data={streaks} /> : <p className="text-sm text-tone-faint">No streak data yet.</p>}
        </div>
      </div>
    </div>
  );
}
