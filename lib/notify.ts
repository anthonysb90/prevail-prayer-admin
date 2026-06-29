import type { SupabaseClient } from "@supabase/supabase-js";

/** Audience segments the admin can target. */
export const SEGMENTS: { value: string; label: string; description: string }[] = [
  { value: "all", label: "Everyone", description: "All registered devices" },
  { value: "premium", label: "Pro members", description: "Premium or gifted Pro" },
  { value: "trial", label: "On trial", description: "Currently in their free trial" },
  { value: "free", label: "Free users", description: "Not Pro and not on trial" },
  { value: "active7", label: "Active (7d)", description: "Used the app in the last 7 days" },
  { value: "inactive14", label: "Lapsed (14d+)", description: "No activity in 14+ days" },
  { value: "streak7", label: "Streak ≥ 7", description: "On a 7-day+ prayer streak" },
  { value: "birthday_month", label: "Birthday this month", description: "Birthday falls in the current month" },
  { value: "premium_unused", label: "Hasn't explored premium", description: "Has premium access (Pro, gifted, or trial) but hasn't opened a devotion, journaled, saved Scripture, or used the timer" },
];

export interface NotifData {
  counts: Record<string, number>;
  totalUsers: number;
  reachableUsers: number;
  history: { id: string; title: string; body: string | null; segment: string | null; sent_count: number; created_at: string }[];
  scheduled: { id: string; title: string; body: string | null; segment: string; send_at: string }[];
  error?: string;
}

interface AudienceRow {
  id: string;
  status: string | null;
  comped: boolean;
  lastActive: number | null; // epoch ms
  streak: number;
  birthdayMonth: number | null; // 1-12
  usedPremium: boolean; // has touched any premium feature
}

export interface Audience {
  rows: AudienceRow[];
  tokensByUser: Map<string, string[]>;
}

/** Load all profiles (segment criteria) + push tokens, via the service-role client. */
export async function loadAudience(admin: SupabaseClient): Promise<Audience> {
  const now = Date.now();
  const [{ data: profiles }, { data: tokens }, ...featureSets] = await Promise.all([
    admin.from("profiles").select("id, subscription_status, comp_until, prayer_streak, last_active_at, last_prayer_date, birthday"),
    admin.from("user_push_tokens").select("user_id, expo_push_token"),
    admin.from("devotion_responses").select("user_id"),
    admin.from("journal_entries").select("user_id"),
    admin.from("user_favorite_verses").select("user_id"),
    admin.from("prayer_sessions").select("user_id"),
  ]);

  // Anyone who appears in any premium-feature table has "explored" premium.
  const usedPremiumIds = new Set<string>();
  for (const set of featureSets) {
    for (const r of (set?.data ?? []) as { user_id: string | null }[]) {
      if (r.user_id) usedPremiumIds.add(r.user_id);
    }
  }

  const rows: AudienceRow[] = (profiles ?? []).map((p: any) => {
    const la = p.last_active_at ?? p.last_prayer_date;
    const bd = p.birthday ? new Date(p.birthday) : null;
    return {
      id: p.id,
      status: p.subscription_status ?? null,
      comped: !!p.comp_until && new Date(p.comp_until).getTime() > now,
      lastActive: la ? new Date(la).getTime() : null,
      streak: p.prayer_streak ?? 0,
      birthdayMonth: bd && !isNaN(bd.getTime()) ? bd.getMonth() + 1 : null,
      usedPremium: usedPremiumIds.has(p.id),
    };
  });

  const tokensByUser = new Map<string, string[]>();
  for (const t of tokens ?? []) {
    if (!t.expo_push_token) continue;
    const arr = tokensByUser.get(t.user_id) ?? [];
    arr.push(t.expo_push_token);
    tokensByUser.set(t.user_id, arr);
  }

  return { rows, tokensByUser };
}

const DAY = 86400000;

/** Whether a user matches a segment. */
export function segmentMatch(row: AudienceRow, segment: string): boolean {
  const now = Date.now();
  const premium = row.status === "premium" || row.comped;
  switch (segment) {
    case "all": return true;
    case "premium": return premium;
    case "trial": return row.status === "trial" && !row.comped;
    case "free": return !premium && row.status !== "trial";
    case "active7": return row.lastActive != null && now - row.lastActive <= 7 * DAY;
    case "inactive14": return row.lastActive == null || now - row.lastActive > 14 * DAY;
    case "streak7": return row.streak >= 7;
    case "birthday_month": return row.birthdayMonth === new Date().getMonth() + 1;
    case "premium_unused": return (premium || row.status === "trial") && !row.usedPremium;
    default: return false;
  }
}

/** Distinct expo push tokens for everyone in a segment. */
export function segmentTokens(aud: Audience, segment: string): string[] {
  const out: string[] = [];
  for (const row of aud.rows) {
    if (!segmentMatch(row, segment)) continue;
    const t = aud.tokensByUser.get(row.id);
    if (t) out.push(...t);
  }
  return out;
}

/** Total users, and how many are reachable (have at least one push token). */
export function reachStats(aud: Audience): { totalUsers: number; reachableUsers: number } {
  let reachableUsers = 0;
  for (const row of aud.rows) if (aud.tokensByUser.has(row.id)) reachableUsers++;
  return { totalUsers: aud.rows.length, reachableUsers };
}

/** Recipient (distinct user) count per segment — only users who have a token. */
export function segmentCounts(aud: Audience): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of SEGMENTS) counts[s.value] = 0;
  for (const row of aud.rows) {
    if (!aud.tokensByUser.has(row.id)) continue; // only reachable users
    for (const s of SEGMENTS) if (segmentMatch(row, s.value)) counts[s.value]++;
  }
  return counts;
}

/** Send an Expo push to a list of tokens, batched. Returns count delivered to Expo. */
export async function sendExpoPush(tokens: string[], title: string, body: string, type: string, screen?: string): Promise<number> {
  const list = tokens.filter(Boolean);
  if (list.length === 0) return 0;
  const messages = list.map((to) => ({ to, title, body, data: { screen: screen || "/notifications", type }, sound: "default" }));
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(batch),
    });
    if (res.ok) sent += batch.length;
  }
  return sent;
}
