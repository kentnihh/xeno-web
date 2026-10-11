-- ==============================================================================
-- XENO ENTERTAINMENT - EVENT CREW (ASSIGNMENTS) MIGRATION SCRIPT
-- Paste and run this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New query -> Run
-- ==============================================================================

-- 1. Create event_crew junction table
create table if not exists public.event_crew (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_in_event text not null default 'Kru Lapangan',
  notes text,
  created_at timestamptz default now() not null,
  unique(event_id, profile_id)
);

-- 2. Indexes for fast query lookups
create index if not exists idx_event_crew_event on public.event_crew(event_id);
create index if not exists idx_event_crew_profile on public.event_crew(profile_id);

-- 3. Enable Row Level Security (RLS)
alter table public.event_crew enable row level security;

-- 4. RLS Policies
-- All authenticated users (staff, manager, admin) can view crew assignments
drop policy if exists "Event crew viewable by authenticated users" on public.event_crew;
create policy "Event crew viewable by authenticated users"
  on public.event_crew
  for select
  to authenticated
  using (true);

-- Authenticated team members can insert/assign crew
drop policy if exists "Authenticated users can assign crew" on public.event_crew;
create policy "Authenticated users can assign crew"
  on public.event_crew
  for insert
  to authenticated
  with check (true);

-- Authenticated team members can update crew assignments
drop policy if exists "Authenticated users can update crew" on public.event_crew;
create policy "Authenticated users can update crew"
  on public.event_crew
  for update
  to authenticated
  using (true);

-- Authenticated team members can remove crew assignments
drop policy if exists "Authenticated users can delete crew" on public.event_crew;
create policy "Authenticated users can delete crew"
  on public.event_crew
  for delete
  to authenticated
  using (true);
