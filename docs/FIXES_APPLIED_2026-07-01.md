# Prevail Prayer Admin — Fixes Applied

**Date:** July 1, 2026
Every item from `REVIEW_2026-07-01_full.md` was addressed. Summary below, with the files touched and anything still requiring your action.

---

## Critical

### #1 Image `track` SSRF / Unsplash key leak — FIXED
`app/api/images/track/route.ts` now parses `downloadLocation` and only fetches it when the host is exactly `api.unsplash.com` over HTTPS. Any other URL is rejected with 400, so the key can never be sent to an attacker-controlled host.

### #2 Image `search` open proxy — FIXED
`app/api/images/search/route.ts` now requires either a signed-in admin session or the correct contributor password (sent as an `x-contrib-pass` header), and applies a per-IP rate limit of 30 searches/minute. The contribute page passes its password through automatically; admins are authorized by their session cookie.
New helpers: `lib/contributorAuth.ts` (shared password logic), `lib/rateLimit.ts` (in-memory limiter). `ImagePickerModal` gained an optional `contribPassword` prop; `ContributeForm` passes it.

---

## High

### #3 1,000-row cap — FIXED
Added `lib/paginate.ts` (`fetchAllRows`) which pages through results in 1,000-row chunks. Applied in:
- `lib/notify.ts` `loadAudience` — profiles, push tokens, and all feature tables.
- `app/(dashboard)/analytics/page.tsx` — all profiles.
- `app/(dashboard)/engagement/page.tsx` — profiles, push tokens, and per-feature counts.
- `app/(dashboard)/versions/actions.ts` — push tokens for the outdated-version nudge.

Notifications now reach every user, and analytics/engagement count everyone.

### #5 Editor role coherence — FIXED
Introduced `lib/authz.ts` with two gates:
- `requireAdmin()` — full admins only.
- `requireEditor()` — content editors **and** full admins.

Applied consistently: devotions, scripture, and music actions use `requireEditor()` (matching what the sidebar and middleware allow editors into); users, notifications, settings, site, versions, feedback, and AI-costs use `requireAdmin()`. This removed nine duplicated local `requireAdmin` copies. Music actions previously let editors through by accident and had no audit logging — both fixed (audit added for upload/rename/show-hide/delete).

### #6 Scripture + CSV writes moved to server actions — FIXED
- New `app/(dashboard)/scripture/actions.ts`: `listVerses`, `addVerse`, `deleteVerse`, `setVerseFeatured`, `importVerses` — all service-role, all audited, all editor-gated.
- `app/(dashboard)/scripture/page.tsx` rewritten to call those actions, show real error messages, and roll back optimistic updates when a write fails (no more silent failures).
- `ImportScriptures` and `ImportDevotions` no longer write from the browser; they call `importVerses` / `importDevotions` server actions. `importDevotions` was added to the devotions actions.

---

## Medium / hardening

### #7 Loading and error states — FIXED
Added `app/(dashboard)/loading.tsx` (skeleton) and `app/(dashboard)/error.tsx` (friendly retry) so navigation no longer feels dead and errors no longer render as an unstyled crash.

### #8 Contributor password brute-force — FIXED
`verifyContributorPassword` is now rate-limited to 10 attempts / 10 minutes per IP (reusing the existing `contribute_attempts` table). Submission throttling was refactored to share the same helper.

### #9 Bucket-per-upload creation — FIXED
`lib/storage.ts` `ensurePublicBucket` creates each bucket at most once per server process instead of on every upload. Used by both music and contribute image uploads.

### #10 Read pages trusted middleware alone — FIXED
`app/(dashboard)/layout.tsx` is now a server component that calls `assertEditorPage()` (`lib/pageGuard.ts`) before rendering. Every dashboard page inherits a defense-in-depth admin check, so a middleware misconfiguration can no longer leak service-role data.

### #11 / #12 Spoofable IP, markdown preview — reviewed
The `x-forwarded-for` limiter is a defense-in-depth layer, left as-is (documented). The site-editor markdown preview escapes `&<>` and allows only `http(s)`/`mailto` links, so it is safe; left unchanged.

---

## Still needs your action (infrastructure / can't be done from code)

1. **Verify the live database.** Run the Supabase **Security Advisor** on the Prevail project and confirm RLS on `scripture_verses` write commands. Scripture writes now go through the service role, so the admin panel works regardless, but the app's own client still depends on correct RLS.
2. **Optional performance follow-up (#4).** Pagination fixes correctness now. For large user counts, moving the analytics/engagement tallies into SQL (a view or `count()`/`group by` RPC) would be faster than fetch-and-count in Node. Not required yet.
3. **Buckets.** If the `music` and `devotion-images` buckets don't already exist, they'll be created on first upload as before — just once per process now. Creating them up front in Supabase with explicit policies is cleaner if you want to.

---

## Verification

TypeScript type-checked: no new type errors were introduced. (The sandbox used for this pass has an incomplete `node_modules`, so framework type declarations like `next/*` and `lucide-react` report as unresolved even in untouched files — those clear in the normal Vercel build. Run `npm run build` locally or let Vercel build to confirm end to end.)
