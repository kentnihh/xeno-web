-- ==============================================================================
-- XENO ENTERTAINMENT - EVENT BUDGET (RENCANA ANGGARAN) SCHEMA UPDATE
-- Paste and run this script in Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New query -> Run
-- ==============================================================================

-- 1. Ensure public.events.budget column allows NULL values
alter table public.events alter column budget drop not null;

-- 2. Drop default value 0.00 so unspecified budgets store NULL instead of 0
alter table public.events alter column budget drop default;

-- 3. Add CHECK constraint ensuring that IF budget is specified, it must be strictly > 0
alter table public.events drop constraint if exists check_event_budget_positive;
alter table public.events add constraint check_event_budget_positive check (budget is null or budget > 0);
