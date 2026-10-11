-- ==============================================================================
-- XENO ENTERTAINMENT - EVENT DOCUMENTS (SUPABASE STORAGE) MIGRATION
-- Paste and run this script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yblhtchviuslhfwiwyuo/sql/new
-- ==============================================================================

-- 1. Create Supabase Storage bucket 'event-documents'
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-documents',
  'event-documents',
  false,
  52428800, -- 50MB file size limit
  null
)
on conflict (id) do nothing;

-- 2. Storage RLS policies for bucket 'event-documents'
-- Authenticated users can view/download files
drop policy if exists "Authenticated users can read event-documents" on storage.objects;
create policy "Authenticated users can read event-documents"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'event-documents');

-- Authenticated users can upload files
drop policy if exists "Authenticated users can upload event-documents" on storage.objects;
create policy "Authenticated users can upload event-documents"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'event-documents');

-- Authenticated users can update files
drop policy if exists "Authenticated users can update event-documents" on storage.objects;
create policy "Authenticated users can update event-documents"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'event-documents');

-- Authenticated users can delete files
drop policy if exists "Authenticated users can delete event-documents" on storage.objects;
create policy "Authenticated users can delete event-documents"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'event-documents');

-- 3. Create event_documents metadata table
create table if not exists public.event_documents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text not null,
  file_size bigint default 0,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

-- 4. Indexes for fast query lookups
create index if not exists idx_event_documents_event_id on public.event_documents(event_id);
create index if not exists idx_event_documents_uploaded_by on public.event_documents(uploaded_by);
create index if not exists idx_event_documents_created_at on public.event_documents(created_at);

-- 5. Enable Row Level Security (RLS)
alter table public.event_documents enable row level security;

-- 6. Table RLS Policies
-- Authenticated users can read document metadata
drop policy if exists "Event documents viewable by authenticated users" on public.event_documents;
create policy "Event documents viewable by authenticated users"
  on public.event_documents
  for select
  to authenticated
  using (true);

-- Authenticated users can insert document metadata
drop policy if exists "Authenticated users can upload event documents" on public.event_documents;
create policy "Authenticated users can upload event documents"
  on public.event_documents
  for insert
  to authenticated
  with check (true);

-- Authenticated users can update document metadata
drop policy if exists "Authenticated users can update event documents" on public.event_documents;
create policy "Authenticated users can update event documents"
  on public.event_documents
  for update
  to authenticated
  using (true)
  with check (true);

-- Authenticated users can delete document metadata
drop policy if exists "Authenticated users can delete event documents" on public.event_documents;
create policy "Authenticated users can delete event documents"
  on public.event_documents
  for delete
  to authenticated
  using (true);
