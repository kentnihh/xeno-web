-- ==============================================================================
-- XENO ENTERTAINMENT - EVENT EXPENSES (FINANCIAL TRACKING) MIGRATION
-- Paste and run this script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yblhtchviuslhfwiwyuo/sql/new
-- ==============================================================================

-- 1. Create event_expenses table
create table if not exists public.event_expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  category text not null check (category in ('Vendor', 'Logistics', 'F&B', 'Others')),
  expense_date date not null default current_date,
  status text not null default 'Unpaid' check (status in ('Paid', 'Unpaid')),
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Indexes for fast query lookups
create index if not exists idx_event_expenses_event_id on public.event_expenses(event_id);
create index if not exists idx_event_expenses_date on public.event_expenses(expense_date);
create index if not exists idx_event_expenses_status on public.event_expenses(status);
create index if not exists idx_event_expenses_category on public.event_expenses(category);

-- 3. Enable Row Level Security (RLS)
alter table public.event_expenses enable row level security;

-- 4. RLS Policies
-- All authenticated users can view event expenses
drop policy if exists "Event expenses viewable by authenticated users" on public.event_expenses;
create policy "Event expenses viewable by authenticated users"
  on public.event_expenses
  for select
  to authenticated
  using (true);

-- Authenticated users can insert event expenses
drop policy if exists "Authenticated users can create expenses" on public.event_expenses;
create policy "Authenticated users can create expenses"
  on public.event_expenses
  for insert
  to authenticated
  with check (true);

-- Authenticated users can update event expenses
drop policy if exists "Authenticated users can update expenses" on public.event_expenses;
create policy "Authenticated users can update expenses"
  on public.event_expenses
  for update
  to authenticated
  using (true);

-- Authenticated users can delete event expenses
drop policy if exists "Authenticated users can delete expenses" on public.event_expenses;
create policy "Authenticated users can delete expenses"
  on public.event_expenses
  for delete
  to authenticated
  using (true);
