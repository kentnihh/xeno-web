-- XENO ENTERTAINMENT - RBAC TABLES & SEED

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
$$ language plpgsql security definer stable;

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
