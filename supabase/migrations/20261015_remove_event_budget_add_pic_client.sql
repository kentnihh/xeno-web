-- Migration: Drop budget columns and add pic, client_id to public.events

-- 1. Drop budget check constraint if exists
alter table public.events drop constraint if exists check_event_budget_positive;

-- 2. Drop budget and finance columns from events table
alter table public.events drop column if exists budget;
alter table public.events drop column if exists estimated_budget;
alter table public.events drop column if exists actual_cost;

-- 3. Add pic (Person In Charge) text column
alter table public.events add column if not exists pic text;

-- 4. Ensure client_id column exists referencing public.clients(id)
alter table public.events add column if not exists client_id uuid references public.clients(id) on delete set null;

-- Index client_id for foreign key lookup performance
create index if not exists idx_events_client_id on public.events(client_id);
