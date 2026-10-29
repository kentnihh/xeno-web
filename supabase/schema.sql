-- ==============================================================================
-- XENO ENTERTAINMENT - CANONICAL DATABASE SCHEMA (Single Source of Truth)
--
-- This file defines the full schema for the Xeno Operations platform:
-- 1. Database Extensions
-- 2. Custom Types / ENUMs
-- 3. Core Operational & RBAC Tables (with ON DELETE CASCADE)
-- 4. Triggers & Stored Functions (updated_at, user profile sync, admin check)
-- 5. Foreign Key & Performance Indexes
-- 6. Storage Buckets & Policies
-- 7. Row Level Security (RLS) Policies
--
-- Syntax is 100% idempotent and safe to execute against existing databases.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DATABASE EXTENSIONS
-- ------------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. CUSTOM TYPES / ENUMS (IDEMPOTENT)
-- ------------------------------------------------------------------------------
do $$ begin
  create type public.event_status as enum ('draft', 'planning', 'confirmed', 'ongoing', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_status as enum ('todo', 'in_progress', 'done');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.vendor_status as enum ('proposed', 'contracted', 'paid');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.user_role as enum ('SUPER_ADMIN', 'admin', 'manager', 'staff', 'super_admin');
exception when duplicate_object then
  alter type public.user_role add value if not exists 'SUPER_ADMIN';
  alter type public.user_role add value if not exists 'super_admin';
  alter type public.user_role add value if not exists 'admin';
  alter type public.user_role add value if not exists 'manager';
  alter type public.user_role add value if not exists 'staff';
end $$;

-- ------------------------------------------------------------------------------
-- 3. TABLES DEFINITIONS
-- ------------------------------------------------------------------------------

-- Profiles (Linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.user_role not null default 'staff',
  phone text,
  avatar_url text,
  avatar_color text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Ensure avatar_color column exists if table pre-existed
alter table public.profiles add column if not exists avatar_color text;

-- Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  phone text not null,
  address text,
  notes text,
  event_type text,
  partner_name text,
  partner_email text,
  partner_phone text,
  partner_address text,
  created_at timestamptz default now() not null
);

-- Ensure dynamic client partner columns exist if table pre-existed
alter table public.clients add column if not exists event_type text;
alter table public.clients add column if not exists partner_name text;
alter table public.clients add column if not exists partner_email text;
alter table public.clients add column if not exists partner_phone text;
alter table public.clients add column if not exists partner_address text;

-- Vendors
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  pic_name text not null,
  phone text not null,
  email text,
  address text,
  notes text,
  created_at timestamptz default now() not null
);

-- Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  client_id uuid references public.clients(id) on delete set null,
  pic text,
  venue text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  status public.event_status not null default 'planning',
  pax integer default null,
  created_by uuid references public.profiles(id) on delete set null,
  gcal_event_id text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Ensure columns exist if events pre-existed
alter table public.events add column if not exists gcal_event_id text;
alter table public.events add column if not exists pax integer default null;

-- Event Tasks
create table if not exists public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date timestamptz,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  gcal_event_id text,
  gcal_start timestamptz,
  gcal_end timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Ensure event_tasks gcal columns exist if table pre-existed
alter table public.event_tasks add column if not exists gcal_event_id text;
alter table public.event_tasks add column if not exists gcal_start timestamptz;
alter table public.event_tasks add column if not exists gcal_end timestamptz;

-- Event Vendors (Junction)
create table if not exists public.event_vendors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  service_name text not null,
  cost numeric(14, 2) default 0.00,
  status public.vendor_status not null default 'proposed',
  notes text,
  created_at timestamptz default now() not null,
  unique(event_id, vendor_id)
);

-- Event Crew (Internal Staff Assignment)
create table if not exists public.event_crew (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_in_event text not null default 'Kru Lapangan',
  notes text,
  created_at timestamptz default now() not null,
  unique(event_id, profile_id)
);

-- Event Expenses (Financial Tracking)
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

-- Event Documents & File Metadata
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

-- Event Sheets (FortuneSheet Spreadsheet JSONB)
create table if not exists public.event_sheets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sheet_name text not null,
  order_index integer not null default 0,
  sort_order integer not null default 0,
  data jsonb not null default '{"columns": [], "rows": []}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(event_id, sheet_name)
);

-- Ensure sort_order column exists on event_sheets
alter table public.event_sheets add column if not exists sort_order integer not null default 0;

-- Master Templates Table
create table if not exists public.master_templates (
  id uuid primary key default gen_random_uuid(),
  sheet_name text not null unique,
  order_index integer not null default 0,
  sort_order integer not null default 0,
  jsonb_structure jsonb not null default '{"columns": [], "rows": []}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Ensure sort_order column exists on master_templates
alter table public.master_templates add column if not exists sort_order integer not null default 0;

-- Event Public Forms (Client-facing Dynamic Family Data & Token Auth)
create table if not exists public.event_public_forms (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  token text not null unique,
  slug text,
  title text default 'Formulir Data Keluarga',
  is_active boolean not null default true,
  expires_at timestamptz not null,
  form_schema jsonb not null default '[]'::jsonb,
  form_data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint event_public_forms_event_id_unique unique (event_id)
);

-- Ensure slug, title, is_active, and unique constraint on event_id exist
alter table public.event_public_forms 
  add column if not exists is_active boolean not null default true,
  add column if not exists slug text,
  add column if not exists title text default 'Formulir Data Keluarga';

alter table public.event_public_forms 
  alter column id set default gen_random_uuid(),
  alter column is_active set default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'event_public_forms_event_id_unique'
  ) then
    alter table public.event_public_forms add constraint event_public_forms_event_id_unique unique (event_id);
  end if;
end $$;

-- Master Family Templates (Default blueprint for event public forms)
create table if not exists public.master_family_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Master Template Data Keluarga',
  categories jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RBAC: Roles
create table if not exists public.roles (
  id text primary key,
  name text not null unique,
  description text,
  created_at timestamptz default now() not null
);

-- RBAC: Permissions
create table if not exists public.permissions (
  id text primary key,
  name text not null unique,
  description text,
  module text not null,
  created_at timestamptz default now() not null
);

-- RBAC: Role Permissions (Junction)
create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id text not null references public.roles(id) on delete cascade,
  permission_id text not null references public.permissions(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(role_id, permission_id)
);

-- RBAC: User Roles (Junction)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id text not null references public.roles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(user_id, role_id)
);

-- ------------------------------------------------------------------------------
-- 4. DATABASE FUNCTIONS & TRIGGERS
-- ------------------------------------------------------------------------------

-- Generic handle_updated_at function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.handle_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at before update on public.events for each row execute function public.handle_updated_at();

drop trigger if exists set_event_tasks_updated_at on public.event_tasks;
create trigger set_event_tasks_updated_at before update on public.event_tasks for each row execute function public.handle_updated_at();

drop trigger if exists set_event_expenses_updated_at on public.event_expenses;
create trigger set_event_expenses_updated_at before update on public.event_expenses for each row execute function public.handle_updated_at();

drop trigger if exists set_event_sheets_updated_at on public.event_sheets;
create trigger set_event_sheets_updated_at before update on public.event_sheets for each row execute function public.handle_updated_at();

drop trigger if exists set_master_templates_updated_at on public.master_templates;
create trigger set_master_templates_updated_at before update on public.master_templates for each row execute function public.handle_updated_at();

drop trigger if exists set_event_public_forms_updated_at on public.event_public_forms;
create trigger set_event_public_forms_updated_at before update on public.event_public_forms for each row execute function public.handle_updated_at();

drop trigger if exists set_master_family_templates_updated_at on public.master_family_templates;
create trigger set_master_family_templates_updated_at before update on public.master_family_templates for each row execute function public.handle_updated_at();

-- Auto Profile Sync on Signup from auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'staff'
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    email = coalesce(excluded.email, public.profiles.email);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Security Helper: is_admin()
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() 
      and (lower(role::text) = 'admin' or lower(role::text) = 'super_admin')
  ) or exists (
    select 1 from public.user_roles
    where user_id = auth.uid() 
      and (lower(role_id) = 'admin' or lower(role_id) = 'super_admin')
  );
end;
$$ language plpgsql security definer set search_path = public stable;

-- Security Helper: is_super_admin()
create or replace function public.is_super_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and lower(role::text) = 'super_admin'
  ) or exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and lower(role_id) = 'super_admin'
  );
end;
$$ language plpgsql security definer set search_path = public stable;

-- ------------------------------------------------------------------------------
-- Privilege Escalation & Self-Role Elevation Guards
-- ------------------------------------------------------------------------------

-- Prevent unauthorized role tampering on profiles table
create or replace function public.prevent_self_role_escalation()
returns trigger as $$
declare
  caller_role text;
  jwt_role text;
begin
  if NEW.role is distinct from OLD.role then
    begin
      jwt_role := current_setting('request.jwt.claim.role', true);
    exception when others then
      jwt_role := null;
    end;

    if jwt_role = 'service_role' then
      return NEW;
    end if;

    if current_user in ('postgres', 'supabase_admin') and auth.uid() is null then
      return NEW;
    end if;

    if auth.uid() is null then
      raise exception 'Akses ditolak: Autentikasi diperlukan.';
    end if;

    select role::text into caller_role from public.profiles where id = auth.uid();
    
    if upper(caller_role) not in ('SUPER_ADMIN', 'ADMIN') then
      raise exception 'Akses ditolak: Anda tidak memiliki izin untuk mengubah peran.';
    end if;

    if NEW.id = auth.uid() then
      raise exception 'Akses ditolak: Anda tidak dapat mengubah peran akun Anda sendiri.';
    end if;

    if upper(NEW.role::text) = 'SUPER_ADMIN' and upper(caller_role) != 'SUPER_ADMIN' then
      raise exception 'Akses ditolak: Hanya Super Admin yang dapat menugaskan peran Super Admin.';
    end if;
  end if;
  
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_self_role_escalation();

-- Prevent unauthorized role assignment in user_roles table
create or replace function public.prevent_user_roles_escalation()
returns trigger as $$
declare
  caller_role text;
  jwt_role text;
begin
  begin
    jwt_role := current_setting('request.jwt.claim.role', true);
  exception when others then
    jwt_role := null;
  end;

  if jwt_role = 'service_role' then
    return NEW;
  end if;

  if current_user in ('postgres', 'supabase_admin') and auth.uid() is null then
    return NEW;
  end if;

  if auth.uid() is null then
    raise exception 'Akses ditolak: Autentikasi diperlukan.';
  end if;

  select role::text into caller_role from public.profiles where id = auth.uid();
  
  if upper(caller_role) not in ('SUPER_ADMIN', 'ADMIN') then
    raise exception 'Akses ditolak: Anda tidak memiliki izin untuk mengelola peran pengguna.';
  end if;

  if NEW.user_id = auth.uid() then
    raise exception 'Akses ditolak: Anda tidak dapat mengubah peran akun Anda sendiri.';
  end if;

  if (upper(NEW.role_id) = 'SUPER_ADMIN' or upper(NEW.role_id) = 'SUPER_ADMINISTRATOR') and upper(caller_role) != 'SUPER_ADMIN' then
    raise exception 'Akses ditolak: Hanya Super Admin yang dapat menugaskan peran Super Admin.';
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prevent_user_roles_escalation on public.user_roles;
create trigger trg_prevent_user_roles_escalation
  before insert or update on public.user_roles
  for each row
  execute function public.prevent_user_roles_escalation();

-- Protect primary root admin account against unauthorized deletion or role tampering
create or replace function public.protect_root_admin_account()
returns trigger as $$
declare
  caller_email text;
  jwt_role text;
begin
  if OLD.email = 'admin@xenoent.com' then
    begin
      jwt_role := current_setting('request.jwt.claim.role', true);
    exception when others then
      jwt_role := null;
    end;

    if jwt_role = 'service_role' then
      if TG_OP = 'DELETE' then
        return OLD;
      else
        return NEW;
      end if;
    end if;

    if current_user in ('postgres', 'supabase_admin') and auth.uid() is null then
      if TG_OP = 'DELETE' then
        return OLD;
      else
        return NEW;
      end if;
    end if;

    if TG_OP = 'DELETE' then
      raise exception 'Akses ditolak: Akun root admin tidak dapat dihapus.';
    end if;

    select email into caller_email from auth.users where id = auth.uid();

    if (NEW.role is distinct from OLD.role) and (caller_email is distinct from 'admin@xenoent.com') then
      raise exception 'Akses ditolak: Peran akun admin@xenoent.com dilindungi dan tidak dapat diubah oleh pengguna lain.';
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_protect_root_admin on public.profiles;
create trigger trg_protect_root_admin
  before update or delete on public.profiles
  for each row
  execute function public.protect_root_admin_account();

-- ------------------------------------------------------------------------------
-- 5. PERFORMANCE & LOOKUP INDEXES
-- ------------------------------------------------------------------------------
create index if not exists idx_events_start_date on public.events(start_date);
create index if not exists idx_events_status on public.events(status);
create index if not exists idx_events_client_id on public.events(client_id);
create index if not exists idx_events_gcal_event_id on public.events(gcal_event_id);

create index if not exists idx_event_tasks_event_id on public.event_tasks(event_id);
create index if not exists idx_event_tasks_assigned_to on public.event_tasks(assigned_to);
create index if not exists idx_event_tasks_status on public.event_tasks(status);
create index if not exists idx_event_tasks_due_date on public.event_tasks(due_date);
create index if not exists idx_event_tasks_gcal_event_id on public.event_tasks(gcal_event_id);

create index if not exists idx_event_expenses_event_id on public.event_expenses(event_id);
create index if not exists idx_event_expenses_date on public.event_expenses(expense_date);
create index if not exists idx_event_expenses_status on public.event_expenses(status);
create index if not exists idx_event_expenses_category on public.event_expenses(category);

create index if not exists idx_event_documents_event_id on public.event_documents(event_id);
create index if not exists idx_event_documents_uploaded_by on public.event_documents(uploaded_by);
create index if not exists idx_event_documents_created_at on public.event_documents(created_at);

create index if not exists idx_event_sheets_event_id on public.event_sheets(event_id);
create index if not exists idx_event_sheets_order_index on public.event_sheets(order_index);
create index if not exists idx_event_sheets_sort_order on public.event_sheets(sort_order);

create index if not exists idx_master_templates_order on public.master_templates(order_index);
create index if not exists idx_master_templates_sort_order on public.master_templates(sort_order);

create index if not exists idx_event_public_forms_token on public.event_public_forms(token);
create index if not exists idx_event_public_forms_event_id on public.event_public_forms(event_id);

create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role_id on public.user_roles(role_id);
create index if not exists idx_role_permissions_role_id on public.role_permissions(role_id);
create index if not exists idx_role_permissions_permission_id on public.role_permissions(permission_id);

-- ------------------------------------------------------------------------------
-- 6. STORAGE BUCKETS & POLICIES
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bucket-files', 'bucket-files', false, 52428800, null)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-documents', 'event-documents', false, 52428800, null)
on conflict (id) do nothing;

-- Storage: bucket-files
drop policy if exists "Authenticated users can read bucket-files" on storage.objects;
create policy "Authenticated users can read bucket-files" on storage.objects
  for select to authenticated using (bucket_id in ('bucket-files', 'event-documents'));

drop policy if exists "Authenticated users can upload bucket-files" on storage.objects;
create policy "Authenticated users can upload bucket-files" on storage.objects
  for insert to authenticated with check (bucket_id in ('bucket-files', 'event-documents'));

drop policy if exists "Authenticated users can update bucket-files" on storage.objects;
create policy "Authenticated users can update bucket-files" on storage.objects
  for update to authenticated using (bucket_id in ('bucket-files', 'event-documents'));

drop policy if exists "Authenticated users can delete bucket-files" on storage.objects;
create policy "Authenticated users can delete bucket-files" on storage.objects
  for delete to authenticated using (bucket_id in ('bucket-files', 'event-documents'));

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS across all application tables
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.vendors enable row level security;
alter table public.events enable row level security;
alter table public.event_tasks enable row level security;
alter table public.event_vendors enable row level security;
alter table public.event_crew enable row level security;
alter table public.event_expenses enable row level security;
alter table public.event_documents enable row level security;
alter table public.event_sheets enable row level security;
alter table public.master_templates enable row level security;
alter table public.event_public_forms enable row level security;
alter table public.master_family_templates enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

-- Profiles Policies
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Profiles viewable by authenticated users" on public.profiles;
create policy "Profiles viewable by authenticated users" on public.profiles for select to authenticated using (true);

drop policy if exists "Users or admin can insert profile" on public.profiles;
create policy "Users or admin can insert profile" on public.profiles for insert to authenticated with check (auth.uid() = id or public.is_admin());

drop policy if exists "Users or admin can update profile" on public.profiles;
create policy "Users or admin can update profile" on public.profiles for update to authenticated using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

drop policy if exists "Admin can delete profile" on public.profiles;
create policy "Admin can delete profile" on public.profiles for delete to authenticated using (public.is_admin());

-- Clients Policies
drop policy if exists "Staff can view clients" on public.clients;
create policy "Staff can view clients" on public.clients for select to authenticated using (true);
drop policy if exists "Staff can insert clients" on public.clients;
create policy "Staff can insert clients" on public.clients for insert to authenticated with check (true);
drop policy if exists "Staff can update clients" on public.clients;
create policy "Staff can update clients" on public.clients for update to authenticated using (true);
drop policy if exists "Admin can delete clients" on public.clients;
create policy "Admin can delete clients" on public.clients for delete to authenticated using (public.is_admin());

-- Vendors Policies
drop policy if exists "Staff can view vendors" on public.vendors;
create policy "Staff can view vendors" on public.vendors for select to authenticated using (true);
drop policy if exists "Staff can insert vendors" on public.vendors;
create policy "Staff can insert vendors" on public.vendors for insert to authenticated with check (true);
drop policy if exists "Staff can update vendors" on public.vendors;
create policy "Staff can update vendors" on public.vendors for update to authenticated using (true);
drop policy if exists "Admin can delete vendors" on public.vendors;
create policy "Admin can delete vendors" on public.vendors for delete to authenticated using (public.is_admin());

-- Events Policies
drop policy if exists "Staff can view events" on public.events;
create policy "Staff can view events" on public.events for select to authenticated using (true);
drop policy if exists "Staff can insert events" on public.events;
create policy "Staff can insert events" on public.events for insert to authenticated with check (true);
drop policy if exists "Staff can update events" on public.events;
create policy "Staff can update events" on public.events for update to authenticated using (true);
drop policy if exists "Admin can delete events" on public.events;
create policy "Admin can delete events" on public.events for delete to authenticated using (public.is_admin());

-- Event Tasks Policies
drop policy if exists "Staff can view tasks" on public.event_tasks;
create policy "Staff can view tasks" on public.event_tasks for select to authenticated using (true);
drop policy if exists "Staff can insert tasks" on public.event_tasks;
create policy "Staff can insert tasks" on public.event_tasks for insert to authenticated with check (true);
drop policy if exists "Staff can update tasks" on public.event_tasks;
create policy "Staff can update tasks" on public.event_tasks for update to authenticated using (true);
drop policy if exists "Authenticated can delete tasks" on public.event_tasks;
create policy "Authenticated can delete tasks" on public.event_tasks for delete to authenticated using (true);

-- Event Vendors Policies
drop policy if exists "Staff can view event_vendors" on public.event_vendors;
create policy "Staff can view event_vendors" on public.event_vendors for select to authenticated using (true);
drop policy if exists "Staff can insert event_vendors" on public.event_vendors;
create policy "Staff can insert event_vendors" on public.event_vendors for insert to authenticated with check (true);
drop policy if exists "Staff can update event_vendors" on public.event_vendors;
create policy "Staff can update event_vendors" on public.event_vendors for update to authenticated using (true);
drop policy if exists "Authenticated can delete event_vendors" on public.event_vendors;
create policy "Authenticated can delete event_vendors" on public.event_vendors for delete to authenticated using (true);

-- Event Crew Policies
drop policy if exists "Event crew viewable by authenticated users" on public.event_crew;
create policy "Event crew viewable by authenticated users" on public.event_crew for select to authenticated using (true);
drop policy if exists "Authenticated users can assign crew" on public.event_crew;
create policy "Authenticated users can assign crew" on public.event_crew for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update crew" on public.event_crew;
create policy "Authenticated users can update crew" on public.event_crew for update to authenticated using (true);
drop policy if exists "Authenticated users can delete crew" on public.event_crew;
create policy "Authenticated users can delete crew" on public.event_crew for delete to authenticated using (true);

-- Event Expenses Policies
drop policy if exists "Staff can view expenses" on public.event_expenses;
create policy "Staff can view expenses" on public.event_expenses for select to authenticated using (true);
drop policy if exists "Staff can insert expenses" on public.event_expenses;
create policy "Staff can insert expenses" on public.event_expenses for insert to authenticated with check (true);
drop policy if exists "Staff can update expenses" on public.event_expenses;
create policy "Staff can update expenses" on public.event_expenses for update to authenticated using (true);
drop policy if exists "Staff can delete expenses" on public.event_expenses;
drop policy if exists "Admin or manager can delete expenses" on public.event_expenses;
create policy "Admin or manager can delete expenses" on public.event_expenses for delete to authenticated
  using (public.is_admin() or exists (
    select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role_id in ('admin', 'manager')
  ));

-- Event Documents Policies
drop policy if exists "Event documents viewable by authenticated users" on public.event_documents;
create policy "Event documents viewable by authenticated users" on public.event_documents for select to authenticated using (true);
drop policy if exists "Authenticated users can upload event documents" on public.event_documents;
create policy "Authenticated users can upload event documents" on public.event_documents for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update event documents" on public.event_documents;
create policy "Authenticated users can update event documents" on public.event_documents for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete event documents" on public.event_documents;
drop policy if exists "Admin or manager or uploader can delete event documents" on public.event_documents;
create policy "Admin or manager or uploader can delete event documents" on public.event_documents for delete to authenticated
  using (public.is_admin() or uploaded_by = auth.uid() or exists (
    select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role_id in ('admin', 'manager')
  ));

-- Event Sheets Policies
drop policy if exists "Event sheets viewable by authenticated users" on public.event_sheets;
create policy "Event sheets viewable by authenticated users" on public.event_sheets for select to authenticated using (true);
drop policy if exists "Authenticated users can insert event sheets" on public.event_sheets;
create policy "Authenticated users can insert event sheets" on public.event_sheets for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update event sheets" on public.event_sheets;
create policy "Authenticated users can update event sheets" on public.event_sheets for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete event sheets" on public.event_sheets;
drop policy if exists "Admin or manager can delete event sheets" on public.event_sheets;
create policy "Admin or manager can delete event sheets" on public.event_sheets for delete to authenticated
  using (public.is_admin() or exists (
    select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role_id in ('admin', 'manager')
  ));

-- Master Templates Policies
drop policy if exists "Master templates viewable by authenticated users" on public.master_templates;
create policy "Master templates viewable by authenticated users" on public.master_templates for select to authenticated using (true);
drop policy if exists "Master templates insertable by authenticated users" on public.master_templates;
create policy "Master templates insertable by authenticated users" on public.master_templates for insert to authenticated with check (true);
drop policy if exists "Master templates updatable by authenticated users" on public.master_templates;
create policy "Master templates updatable by authenticated users" on public.master_templates for update to authenticated using (true) with check (true);
drop policy if exists "Master templates deletable by authenticated users" on public.master_templates;
create policy "Master templates deletable by authenticated users" on public.master_templates for delete to authenticated using (true);

-- Event Public Forms Policies (Authenticated & Anonymous Token-Based Access)
alter table public.event_public_forms enable row level security;

-- Allow authenticated users full access to event_public_forms
drop policy if exists "Allow authenticated all event_public_forms" on public.event_public_forms;
create policy "Allow authenticated all event_public_forms"
  on public.event_public_forms
  for all
  to authenticated
  using (true)
  with check (true);

-- Allow authenticated users to view forms
drop policy if exists "Allow authenticated read event_public_forms" on public.event_public_forms;
create policy "Allow authenticated read event_public_forms"
  on public.event_public_forms for select
  to authenticated
  using (true);

-- Allow authenticated users to create/insert forms
drop policy if exists "Allow authenticated insert event_public_forms" on public.event_public_forms;
create policy "Allow authenticated insert event_public_forms"
  on public.event_public_forms for insert
  to authenticated
  with check (true);

-- Allow authenticated users to update forms
drop policy if exists "Allow authenticated update event_public_forms" on public.event_public_forms;
create policy "Allow authenticated update event_public_forms"
  on public.event_public_forms for update
  to authenticated
  using (true);

-- Backward-compatible policies
drop policy if exists "Authenticated users can select event_public_forms" on public.event_public_forms;
create policy "Authenticated users can select event_public_forms" on public.event_public_forms for select to authenticated using (true);
drop policy if exists "Authenticated users can insert event_public_forms" on public.event_public_forms;
create policy "Authenticated users can insert event_public_forms" on public.event_public_forms for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update event_public_forms" on public.event_public_forms;
create policy "Authenticated users can update event_public_forms" on public.event_public_forms for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete event_public_forms" on public.event_public_forms;
create policy "Authenticated users can delete event_public_forms" on public.event_public_forms for delete to authenticated using (true);

-- Public / Anonymous Clients Form Access (Handled strictly via Server Actions using Service Role)
drop policy if exists "Public can view event_public_forms with valid token" on public.event_public_forms;
drop policy if exists "Public can update form_data with valid unexpired token" on public.event_public_forms;

-- Master Family Templates Policies
drop policy if exists "Authenticated users can select master_family_templates" on public.master_family_templates;
create policy "Authenticated users can select master_family_templates" on public.master_family_templates for select to authenticated using (true);
drop policy if exists "Authenticated users can insert master_family_templates" on public.master_family_templates;
create policy "Authenticated users can insert master_family_templates" on public.master_family_templates for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update master_family_templates" on public.master_family_templates;
create policy "Authenticated users can update master_family_templates" on public.master_family_templates for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete master_family_templates" on public.master_family_templates;
create policy "Authenticated users can delete master_family_templates" on public.master_family_templates for delete to authenticated using (true);

-- RBAC Policies (Roles, Permissions, Role Permissions, User Roles)
drop policy if exists "Roles viewable by authenticated users" on public.roles;
create policy "Roles viewable by authenticated users" on public.roles for select to authenticated using (true);
drop policy if exists "Admin can insert roles" on public.roles;
create policy "Admin can insert roles" on public.roles for insert to authenticated with check (public.is_admin());
drop policy if exists "Admin can update roles" on public.roles;
create policy "Admin can update roles" on public.roles for update to authenticated using (public.is_admin());
drop policy if exists "Admin can delete roles" on public.roles;
create policy "Admin can delete roles" on public.roles for delete to authenticated using (public.is_admin());

drop policy if exists "Permissions viewable by authenticated users" on public.permissions;
create policy "Permissions viewable by authenticated users" on public.permissions for select to authenticated using (true);
drop policy if exists "Admin can insert permissions" on public.permissions;
create policy "Admin can insert permissions" on public.permissions for insert to authenticated with check (public.is_admin());
drop policy if exists "Admin can update permissions" on public.permissions;
create policy "Admin can update permissions" on public.permissions for update to authenticated using (public.is_admin());
drop policy if exists "Admin can delete permissions" on public.permissions;
create policy "Admin can delete permissions" on public.permissions for delete to authenticated using (public.is_admin());

drop policy if exists "Role permissions viewable by authenticated users" on public.role_permissions;
create policy "Role permissions viewable by authenticated users" on public.role_permissions for select to authenticated using (true);
drop policy if exists "Admin can insert role_permissions" on public.role_permissions;
create policy "Admin can insert role_permissions" on public.role_permissions for insert to authenticated with check (public.is_admin());
drop policy if exists "Admin can delete role_permissions" on public.role_permissions;
create policy "Admin can delete role_permissions" on public.role_permissions for delete to authenticated using (public.is_admin());

drop policy if exists "User roles viewable by authenticated users" on public.user_roles;
create policy "User roles viewable by authenticated users" on public.user_roles for select to authenticated using (true);
drop policy if exists "Admin can insert user_roles" on public.user_roles;
create policy "Admin can insert user_roles" on public.user_roles for insert to authenticated with check (public.is_admin());
drop policy if exists "Admin can delete user_roles" on public.user_roles;
create policy "Admin can delete user_roles" on public.user_roles for delete to authenticated using (public.is_admin());
