-- ==========================================================================
-- Oakframe Media OS — fix portal_type backfill for pre-existing accounts (10/10)
-- Migration 0005 added portal_type with `default 'unassigned'`. In Postgres,
-- adding a column with a default backfills that default onto every existing
-- row — so any account created before 0005 ran (including the real Owner)
-- got silently marked portal_type='unassigned', which the app's login flow
-- (added in this same round of work) treats as a brand-new, not-yet-placed
-- signup and routes to the "awaiting approval" holding screen instead of
-- their workspace.
--
-- This backfills portal_type for accounts that were already active before
-- that column existed, inferring it from their role. It deliberately only
-- touches status = 'active' rows — a genuinely new pending signup has
-- status = 'pending' and is left alone.
-- ==========================================================================

update profiles
set portal_type = case when role = 'contractor' then 'contractor' else 'staff' end
where status = 'active' and portal_type = 'unassigned';
