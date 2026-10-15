-- XENO ENTERTAINMENT - SUPABASE SCHEMA
create extension if not exists "uuid-ossp";

-- Enums (Idempotent)
do $$ begin
  create type event_status as enum ('draft', 'planning', 'confirmed', 'ongoing', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type task_status as enum ('todo', 'in_progress', 'done');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type task_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type user_role as enum ('admin', 'manager', 'staff');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type vendor_status as enum ('proposed', 'contracted', 'paid');
exception when duplicate_object then null;
end $$;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'staff',
  phone text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  phone text not null,
  address text,
  notes text,
  created_at timestamptz default now() not null
);

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
  status event_status not null default 'planning',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Event Tasks
create table if not exists public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date timestamptz,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Event Vendors (Junction)
create table if not exists public.event_vendors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  service_name text not null,
  cost numeric(14, 2) default 0.00,
  status vendor_status not null default 'proposed',
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

-- Event Documents & File Management
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

-- Triggers
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.handle_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at before update on public.events for each row execute function public.handle_updated_at();

drop trigger if exists set_event_tasks_updated_at on public.event_tasks;
create trigger set_event_tasks_updated_at before update on public.event_tasks for each row execute function public.handle_updated_at();

-- Auto Profile on Signup
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
    where id = auth.uid() and role = 'admin'
  ) or exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role_id = 'admin'
  );
end;
$$ language plpgsql security definer set search_path = public stable;

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.vendors enable row level security;
alter table public.events enable row level security;
alter table public.event_tasks enable row level security;
alter table public.event_vendors enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

alter table public.event_crew enable row level security;

-- Event Crew Policies
drop policy if exists "Event crew viewable by authenticated users" on public.event_crew;
create policy "Event crew viewable by authenticated users" on public.event_crew for select to authenticated using (true);

drop policy if exists "Authenticated users can assign crew" on public.event_crew;
create policy "Authenticated users can assign crew" on public.event_crew for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update crew" on public.event_crew;
create policy "Authenticated users can update crew" on public.event_crew for update to authenticated using (true);

drop policy if exists "Authenticated users can delete crew" on public.event_crew;
create policy "Authenticated users can delete crew" on public.event_crew for delete to authenticated using (true);

-- RBAC Policies: Roles, Permissions, Role Permissions, User Roles
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

-- Profiles: Authenticated read, self/admin insert, self/admin update, admin delete
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select to authenticated using (auth.uid() = id);

drop policy if exists "Profiles viewable by authenticated users" on public.profiles;
create policy "Profiles viewable by authenticated users" on public.profiles for select to authenticated using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Authenticated users or admin can insert profile" on public.profiles;
drop policy if exists "Users or admin can insert profile" on public.profiles;
create policy "Users or admin can insert profile" on public.profiles for insert to authenticated with check (auth.uid() = id or public.is_admin());

drop policy if exists "Users or admin can update profile" on public.profiles;
create policy "Users or admin can update profile" on public.profiles for update to authenticated using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

drop policy if exists "Admin can delete profile" on public.profiles;
create policy "Admin can delete profile" on public.profiles for delete to authenticated using (public.is_admin());

-- Clients: All staff read/create/update, admin delete
drop policy if exists "Staff can view clients" on public.clients;
create policy "Staff can view clients" on public.clients for select to authenticated using (true);

drop policy if exists "Staff can insert clients" on public.clients;
create policy "Staff can insert clients" on public.clients for insert to authenticated with check (true);

drop policy if exists "Staff can update clients" on public.clients;
create policy "Staff can update clients" on public.clients for update to authenticated using (true);

drop policy if exists "Admin can delete clients" on public.clients;
create policy "Admin can delete clients" on public.clients for delete to authenticated using (public.is_admin());

-- Vendors: All staff read/create/update, admin delete
drop policy if exists "Staff can view vendors" on public.vendors;
create policy "Staff can view vendors" on public.vendors for select to authenticated using (true);

drop policy if exists "Staff can insert vendors" on public.vendors;
create policy "Staff can insert vendors" on public.vendors for insert to authenticated with check (true);

drop policy if exists "Staff can update vendors" on public.vendors;
create policy "Staff can update vendors" on public.vendors for update to authenticated using (true);

drop policy if exists "Admin can delete vendors" on public.vendors;
create policy "Admin can delete vendors" on public.vendors for delete to authenticated using (public.is_admin());

-- Events: All staff read/create/update, admin delete
drop policy if exists "Staff can view events" on public.events;
create policy "Staff can view events" on public.events for select to authenticated using (true);

drop policy if exists "Staff can insert events" on public.events;
create policy "Staff can insert events" on public.events for insert to authenticated with check (true);

drop policy if exists "Staff can update events" on public.events;
create policy "Staff can update events" on public.events for update to authenticated using (true);

drop policy if exists "Admin can delete events" on public.events;
create policy "Admin can delete events" on public.events for delete to authenticated using (public.is_admin());

-- Event Tasks: All staff read/create/update/delete
drop policy if exists "Staff can view tasks" on public.event_tasks;
create policy "Staff can view tasks" on public.event_tasks for select to authenticated using (true);

drop policy if exists "Staff can insert tasks" on public.event_tasks;
create policy "Staff can insert tasks" on public.event_tasks for insert to authenticated with check (true);

drop policy if exists "Staff can update tasks" on public.event_tasks;
create policy "Staff can update tasks" on public.event_tasks for update to authenticated using (true);

drop policy if exists "Admin can delete tasks" on public.event_tasks;
drop policy if exists "Authenticated can delete tasks" on public.event_tasks;
create policy "Authenticated can delete tasks" on public.event_tasks for delete to authenticated using (true);

-- Event Vendors: All staff read/create/update/delete
drop policy if exists "Staff can view event_vendors" on public.event_vendors;
create policy "Staff can view event_vendors" on public.event_vendors for select to authenticated using (true);

drop policy if exists "Staff can insert event_vendors" on public.event_vendors;
create policy "Staff can insert event_vendors" on public.event_vendors for insert to authenticated with check (true);

drop policy if exists "Staff can update event_vendors" on public.event_vendors;
create policy "Staff can update event_vendors" on public.event_vendors for update to authenticated using (true);

drop policy if exists "Admin can delete event_vendors" on public.event_vendors;
drop policy if exists "Authenticated can delete event_vendors" on public.event_vendors;
create policy "Authenticated can delete event_vendors" on public.event_vendors for delete to authenticated using (true);

-- Event Expenses: All authenticated can view/insert/update/delete
drop policy if exists "Staff can view expenses" on public.event_expenses;
create policy "Staff can view expenses" on public.event_expenses for select to authenticated using (true);

drop policy if exists "Staff can insert expenses" on public.event_expenses;
create policy "Staff can insert expenses" on public.event_expenses for insert to authenticated with check (true);

drop policy if exists "Staff can update expenses" on public.event_expenses;
create policy "Staff can update expenses" on public.event_expenses for update to authenticated using (true);

drop policy if exists "Staff can delete expenses" on public.event_expenses;
create policy "Staff can delete expenses" on public.event_expenses for delete to authenticated using (true);


-- Drop old deprecated policy names if they exist
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Internal staff manage clients" on public.clients;
drop policy if exists "Internal staff manage vendors" on public.vendors;
drop policy if exists "Internal staff manage events" on public.events;
drop policy if exists "Internal staff manage tasks" on public.event_tasks;
drop policy if exists "Internal staff manage event_vendors" on public.event_vendors;

-- Indexes
create index if not exists idx_events_start_date on public.events(start_date);
create index if not exists idx_events_status on public.events(status);
create index if not exists idx_event_tasks_event_id on public.event_tasks(event_id);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_role_permissions_role_id on public.role_permissions(role_id);

create index if not exists idx_event_expenses_event_id on public.event_expenses(event_id);
create index if not exists idx_event_expenses_date on public.event_expenses(expense_date);
create index if not exists idx_event_expenses_status on public.event_expenses(status);
create index if not exists idx_event_expenses_category on public.event_expenses(category);
create index if not exists idx_event_documents_event_id on public.event_documents(event_id);
create index if not exists idx_event_documents_uploaded_by on public.event_documents(uploaded_by);
create index if not exists idx_event_documents_created_at on public.event_documents(created_at);

-- Event Documents Table RLS Policies
alter table public.event_documents enable row level security;

drop policy if exists "Event documents viewable by authenticated users" on public.event_documents;
create policy "Event documents viewable by authenticated users" on public.event_documents for select to authenticated using (true);

drop policy if exists "Authenticated users can upload event documents" on public.event_documents;
create policy "Authenticated users can upload event documents" on public.event_documents for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update event documents" on public.event_documents;
create policy "Authenticated users can update event documents" on public.event_documents for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete event documents" on public.event_documents;
create policy "Authenticated users can delete event documents" on public.event_documents for delete to authenticated using (true);

-- Supabase Storage Bucket & Policies for 'bucket-files'
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bucket-files', 'bucket-files', false, 52428800, null)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can read bucket-files" on storage.objects;
create policy "Authenticated users can read bucket-files" on storage.objects for select to authenticated using (bucket_id = 'bucket-files');

drop policy if exists "Authenticated users can upload bucket-files" on storage.objects;
create policy "Authenticated users can upload bucket-files" on storage.objects for insert to authenticated with check (bucket_id = 'bucket-files');

drop policy if exists "Authenticated users can update bucket-files" on storage.objects;
create policy "Authenticated users can update bucket-files" on storage.objects for update to authenticated using (bucket_id = 'bucket-files');

drop policy if exists "Authenticated users can delete bucket-files" on storage.objects;
create policy "Authenticated users can delete bucket-files" on storage.objects for delete to authenticated using (bucket_id = 'bucket-files');


-- Event Sheets (Dynamic Spreadsheet JSONB)
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

create index if not exists idx_event_sheets_event_id on public.event_sheets(event_id);
create index if not exists idx_event_sheets_order_index on public.event_sheets(order_index);

alter table public.event_sheets enable row level security;

drop policy if exists "Event sheets viewable by authenticated users" on public.event_sheets;
create policy "Event sheets viewable by authenticated users" on public.event_sheets for select to authenticated using (true);

drop policy if exists "Authenticated users can insert event sheets" on public.event_sheets;
create policy "Authenticated users can insert event sheets" on public.event_sheets for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update event sheets" on public.event_sheets;
create policy "Authenticated users can update event sheets" on public.event_sheets for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can delete event sheets" on public.event_sheets;
create policy "Authenticated users can delete event sheets" on public.event_sheets for delete to authenticated using (true);

