-- ============================================================
-- Prevail Prayer — Devotion scheduling (auto-publish on date)
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

-- 1. Column to hold a future publish time. When it's reached, a cron job
--    flips the devotion live (sets is_published + published_at).
ALTER TABLE devotions
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS devotions_scheduled_for_idx
  ON devotions (scheduled_for) WHERE scheduled_for IS NOT NULL;

-- 2. Enable pg_cron (Supabase: runs as the postgres role in the SQL editor).
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Auto-publish job: every 15 minutes, publish any scheduled devotion
--    whose time has arrived. The mobile app already shows devotions where
--    is_published = true, so no app change is needed.
SELECT cron.unschedule('publish-due-devotions')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish-due-devotions');

SELECT cron.schedule(
  'publish-due-devotions',
  '*/15 * * * *',
  $$
    UPDATE devotions
       SET is_published = TRUE,
           published_at = COALESCE(published_at, scheduled_for),
           scheduled_for = NULL
     WHERE scheduled_for IS NOT NULL
       AND scheduled_for <= NOW();
  $$
);

-- ============================================================
-- DONE. New column: devotions.scheduled_for
--       Cron job: publish-due-devotions (every 15 min)
-- ============================================================
