-- ==============================================================================
-- XENO ENTERTAINMENT - CONSOLIDATED MIGRATIONS SCRIPT
-- Paste and run this script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yblhtchviuslhfwiwyuo/sql/new
-- ==============================================================================

-- 1. EVENT SCHEMA SYNC (Drop budget, Add PIC & Client ID)
alter table public.events drop constraint if exists check_event_budget_positive;
alter table public.events drop column if exists budget;
alter table public.events drop column if exists estimated_budget;
alter table public.events drop column if exists actual_cost;
alter table public.events add column if not exists pic text;
alter table public.events add column if not exists client_id uuid references public.clients(id) on delete set null;
create index if not exists idx_events_client_id on public.events(client_id);

-- 2. EVENT CREW (Internal Staff Assignments)
create table if not exists public.event_crew (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_in_event text not null default 'Kru Lapangan',
  notes text,
  created_at timestamptz default now() not null,
  unique(event_id, profile_id)
);

create index if not exists idx_event_crew_event on public.event_crew(event_id);
create index if not exists idx_event_crew_profile on public.event_crew(profile_id);

alter table public.event_crew enable row level security;

drop policy if exists "Event crew viewable by authenticated users" on public.event_crew;
create policy "Event crew viewable by authenticated users"
  on public.event_crew for select to authenticated using (true);

drop policy if exists "Authenticated users can assign crew" on public.event_crew;
create policy "Authenticated users can assign crew"
  on public.event_crew for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update crew" on public.event_crew;
create policy "Authenticated users can update crew"
  on public.event_crew for update to authenticated using (true);

drop policy if exists "Authenticated users can delete crew" on public.event_crew;
create policy "Authenticated users can delete crew"
  on public.event_crew for delete to authenticated using (true);


-- 3. RBAC TABLES & SEED DATA (Roles, Permissions, User Roles)
create table if not exists public.roles (
  id text primary key,
  name text not null unique,
  description text,
  created_at timestamptz default now() not null
);

create table if not exists public.permissions (
  id text primary key,
  name text not null unique,
  description text,
  module text not null,
  created_at timestamptz default now() not null
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id text not null references public.roles(id) on delete cascade,
  permission_id text not null references public.permissions(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(role_id, permission_id)
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id text not null references public.roles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(user_id, role_id)
);

create index if not exists idx_rp_role on public.role_permissions(role_id);
create index if not exists idx_rp_perm on public.role_permissions(permission_id);
create index if not exists idx_ur_user on public.user_roles(user_id);
create index if not exists idx_ur_role on public.user_roles(role_id);

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

drop policy if exists "Roles select" on public.roles;
create policy "Roles select" on public.roles for select to authenticated using (true);
drop policy if exists "Roles all admin" on public.roles;
create policy "Roles all admin" on public.roles for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Permissions select" on public.permissions;
create policy "Permissions select" on public.permissions for select to authenticated using (true);
drop policy if exists "Permissions all admin" on public.permissions;
create policy "Permissions all admin" on public.permissions for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Role perms select" on public.role_permissions;
create policy "Role perms select" on public.role_permissions for select to authenticated using (true);
drop policy if exists "Role perms all admin" on public.role_permissions;
create policy "Role perms all admin" on public.role_permissions for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "User roles select" on public.user_roles;
create policy "User roles select" on public.user_roles for select to authenticated using (true);
drop policy if exists "User roles all admin" on public.user_roles;
create policy "User roles all admin" on public.user_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.roles (id, name, description) values
  ('admin', 'Administrator', 'Akses penuh seluruh konfigurasi sistem & hak akses'),
  ('manager', 'Event Manager', 'Pengelolaan operasional acara, klien, vendor, dan checklist'),
  ('staff', 'Kru Operasional', 'Eksekusi teknis lapangan & update tugas')
on conflict (id) do update set name = excluded.name, description = excluded.description;

insert into public.permissions (id, name, description, module) values
  ('users:manage', 'Kelola Pengguna & Hak Akses', 'Manajemen akun staf dan peran RBAC', 'users'),
  ('events:read', 'Lihat Jadwal & Detail Acara', 'Melihat kalender panggung & rundown', 'events'),
  ('events:create', 'Inisialisasi Acara Baru', 'Membuat project event baru', 'events'),
  ('events:update', 'Perbarui Informasi Acara', 'Mengubah status event & budget', 'events'),
  ('events:delete', 'Hapus Data Acara', 'Menghapus arsip event', 'events'),
  ('clients:manage', 'Kelola Database Klien', 'Mengelola kontak klien Xeno', 'clients'),
  ('vendors:manage', 'Kelola Database Vendor', 'Mengelola vendor mitra', 'vendors'),
  ('tasks:manage', 'Kelola Tugas & Checklist Kru', 'Membuat checklist teknis', 'tasks')
on conflict (id) do update set name = excluded.name, description = excluded.description, module = excluded.module;

insert into public.role_permissions (role_id, permission_id)
select 'admin', id from public.permissions
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id) values
  ('manager', 'events:read'),
  ('manager', 'events:create'),
  ('manager', 'events:update'),
  ('manager', 'clients:manage'),
  ('manager', 'vendors:manage'),
  ('manager', 'tasks:manage'),
  ('staff', 'events:read'),
  ('staff', 'tasks:manage')
on conflict (role_id, permission_id) do nothing;

insert into public.user_roles (user_id, role_id)
select id, role::text from public.profiles
where role::text in ('admin', 'manager', 'staff')
on conflict (user_id, role_id) do nothing;


-- 4. EVENT EXPENSES (Financial Tracking)
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

create index if not exists idx_event_expenses_event_id on public.event_expenses(event_id);
create index if not exists idx_event_expenses_date on public.event_expenses(expense_date);
create index if not exists idx_event_expenses_status on public.event_expenses(status);
create index if not exists idx_event_expenses_category on public.event_expenses(category);

alter table public.event_expenses enable row level security;

drop policy if exists "Event expenses viewable by authenticated users" on public.event_expenses;
create policy "Event expenses viewable by authenticated users"
  on public.event_expenses for select to authenticated using (true);

drop policy if exists "Authenticated users can create expenses" on public.event_expenses;
create policy "Authenticated users can create expenses"
  on public.event_expenses for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update expenses" on public.event_expenses;
create policy "Authenticated users can update expenses"
  on public.event_expenses for update to authenticated using (true);

drop policy if exists "Authenticated users can delete expenses" on public.event_expenses;
create policy "Authenticated users can delete expenses"
  on public.event_expenses for delete to authenticated using (true);


-- ==============================================================================
-- 7. EVENT DOCUMENTS & SUPABASE STORAGE BUCKET
-- ==============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bucket-files', 'bucket-files', false, 52428800, null)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can read bucket-files" on storage.objects;
create policy "Authenticated users can read bucket-files"
  on storage.objects for select to authenticated using (bucket_id = 'bucket-files');

drop policy if exists "Authenticated users can upload bucket-files" on storage.objects;
create policy "Authenticated users can upload bucket-files"
  on storage.objects for insert to authenticated with check (bucket_id = 'bucket-files');

drop policy if exists "Authenticated users can update bucket-files" on storage.objects;
create policy "Authenticated users can update bucket-files"
  on storage.objects for update to authenticated using (bucket_id = 'bucket-files');

drop policy if exists "Authenticated users can delete bucket-files" on storage.objects;
create policy "Authenticated users can delete bucket-files"
  on storage.objects for delete to authenticated using (bucket_id = 'bucket-files');

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

create index if not exists idx_event_documents_event_id on public.event_documents(event_id);
create index if not exists idx_event_documents_uploaded_by on public.event_documents(uploaded_by);
create index if not exists idx_event_documents_created_at on public.event_documents(created_at);

alter table public.event_documents enable row level security;

drop policy if exists "Event documents viewable by authenticated users" on public.event_documents;
create policy "Event documents viewable by authenticated users"
  on public.event_documents for select to authenticated using (true);

drop policy if exists "Authenticated users can upload event documents" on public.event_documents;
create policy "Authenticated users can upload event documents"
  on public.event_documents for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update event documents" on public.event_documents;
create policy "Authenticated users can update event documents"
  on public.event_documents for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete event documents" on public.event_documents;
create policy "Authenticated users can delete event documents"
  on public.event_documents for delete to authenticated using (true);


-- ==============================================================================
-- 8. PROFILES ROW LEVEL SECURITY & AUTH TRIGGER REPAIR
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role_id = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'staff'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    email = COALESCE(EXCLUDED.email, public.profiles.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users or admin can insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Users or admin can insert profile" ON public.profiles;
CREATE POLICY "Users or admin can insert profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users or admin can update profile" ON public.profiles;
CREATE POLICY "Users or admin can update profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Admin can delete profile" ON public.profiles;
CREATE POLICY "Admin can delete profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

