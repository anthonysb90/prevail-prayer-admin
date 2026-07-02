import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * PostgREST returns at most 1,000 rows per request. Anywhere the admin panel
 * needs "every row" (notifications audience, analytics, engagement), use this
 * to page through in 1,000-row chunks instead of silently truncating.
 */
const PAGE = 1000;

export async function fetchAllRows<T = Record<string, unknown>>(
  admin: SupabaseClient,
  table: string,
  columns: string,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  // Hard ceiling so a bad query can never loop forever.
  for (let guard = 0; guard < 1000; guard++) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}
