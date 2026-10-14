-- ==============================================================================
-- XENO ENTERTAINMENT - EVENT SHEETS (DYNAMIC SPREADSHEET JSONB) MIGRATION
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yblhtchviuslhfwiwyuo/sql/new
-- ==============================================================================

-- 1. Create flexible event_sheets table with JSONB grid data
create table if not exists public.event_sheets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sheet_name text not null,
  order_index integer not null default 0,
  data jsonb not null default '{"columns": [], "rows": []}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(event_id, sheet_name)
);

-- 2. Indexes for fast lookup by event and sort order
create index if not exists idx_event_sheets_event_id on public.event_sheets(event_id);
create index if not exists idx_event_sheets_order_index on public.event_sheets(order_index);

-- 3. Enable Row Level Security (RLS)
alter table public.event_sheets enable row level security;

-- 4. RLS Policies
-- Authenticated users can view sheets
drop policy if exists "Event sheets viewable by authenticated users" on public.event_sheets;
create policy "Event sheets viewable by authenticated users"
  on public.event_sheets
  for select
  to authenticated
  using (true);

-- Authenticated users can create sheets
drop policy if exists "Authenticated users can insert event sheets" on public.event_sheets;
create policy "Authenticated users can insert event sheets"
  on public.event_sheets
  for insert
  to authenticated
  with check (true);

-- Authenticated users can update sheets (cells, columns, rows)
drop policy if exists "Authenticated users can update event sheets" on public.event_sheets;
create policy "Authenticated users can update event sheets"
  on public.event_sheets
  for update
  to authenticated
  using (true)
  with check (true);

-- Authenticated users can delete sheets
drop policy if exists "Authenticated users can delete event sheets" on public.event_sheets;
create policy "Authenticated users can delete event sheets"
  on public.event_sheets
  for delete
  to authenticated
  using (true);
