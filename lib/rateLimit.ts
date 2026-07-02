/**
 * Tiny in-memory fixed-window rate limiter. Per-instance only (memory is not
 * shared across serverless instances), so it is a first line of defense against
 * casual abuse, not a hard guarantee. Good enough to protect the public image
 * proxy from a single client hammering it.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * @param key       identifier to limit on (e.g. IP address + route)
 * @param limit     max requests allowed per window
 * @param windowMs  window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfterSec: 0 };
}

/** Opportunistically drop expired buckets so the map can't grow unbounded. */
export function sweepRateLimits(): void {
  const now = Date.now();
  Array.from(buckets.entries()).forEach(([key, win]) => {
    if (now >= win.resetAt) buckets.delete(key);
  });
}
