-- Sample Seed Data for Xeno Entertainment

-- 1. Auto-confirm test accounts in auth.users
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- 2. Sync profiles for existing auth users with designated roles
insert into public.profiles (id, full_name, email, role)
select 
  id, 
  case 
    when email = 'admin@xenoent.com' then 'Jonathan Admin'
    when email = 'staf@xenoent.com' then 'Rian Kru Operasional'
    else coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
  end, 
  email, 
  case 
    when email = 'admin@xenoent.com' then 'admin'::user_role
    else 'staff'::user_role
  end
from auth.users
on conflict (id) do update set 
  role = excluded.role,
  full_name = excluded.full_name;

-- 3. Clients
insert into public.clients (id, name, company, email, phone, address, notes)
values
  ('11111111-1111-1111-1111-111111111111', 'Rian Pratama', 'PT Sinar Jaya Abadi', 'rian@sinarjaya.co.id', '+6281234567890', 'Sudirman SCBD Lot 8, Jakarta Selatan', 'Corporate Gathering 500 pax'),
  ('22222222-2222-2222-2222-222222222222', 'Jessica Tan', 'Tan & Partners', 'jessica.tan@gmail.com', '+6281987654321', 'Menteng, Jakarta Pusat', 'Private Wedding Reception')
on conflict (id) do nothing;

-- 4. Vendors
insert into public.vendors (id, name, category, pic_name, phone, email, notes)
values
  ('33333333-3333-3333-3333-333333333333', 'Spectrum Lighting Pro', 'Lighting', 'Budi Santoso', '+6281311223344', 'budi@spectrumlight.id', 'Moving beam 350W, par LED, laser controller'),
  ('44444444-4444-4444-4444-444444444444', 'Sonic Wave Audio', 'Sound System', 'Agus Salim', '+6281700998877', 'info@sonicwave.com', 'Line array L-Acoustics, digital mixer Allen & Heath'),
  ('55555555-5555-5555-5555-555555555555', 'Delight Gourmet Catering', 'Catering', 'Chef Melinda', '+6281555667788', 'melinda@delightgourmet.id', 'Indonesian & Western buffet, VIP canapes')
on conflict (id) do nothing;

-- 5. Events
insert into public.events (id, title, description, client_id, venue, start_date, end_date, status, budget)
values
  ('66666666-6666-6666-6666-666666666666', 'Sinar Jaya Annual Gala 2026', 'Annual gala dinner & award recognition', '11111111-1111-1111-1111-111111111111', 'Grand Ballroom Hotel Indonesia Kempinski', now() + interval '5 days', now() + interval '5 days 8 hours', 'confirmed', 250000000.00),
  ('77777777-7777-7777-7777-777777777777', 'Jessica & Kevin Wedding Reception', 'Luxury intimate outdoor wedding', '22222222-2222-2222-2222-222222222222', 'Plataran Dharmawangsa', now() + interval '14 days', now() + interval '14 days 6 hours', 'planning', 180000000.00)
on conflict (id) do nothing;

-- 6. Event Vendors
insert into public.event_vendors (event_id, vendor_id, service_name, cost, status)
values
  ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'Full Stage Intelligent Lighting Package', 35000000.00, 'contracted'),
  ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', '20.000 Watt Line Array Sound Rig', 40000000.00, 'contracted')
on conflict (event_id, vendor_id) do nothing;

-- 7. Event Tasks
insert into public.event_tasks (event_id, title, description, due_date, status, priority)
values
  ('66666666-6666-6666-6666-666666666666', 'Finalize Rundown with MC', 'Confirm timing for CEO opening speech and awards', now() + interval '2 days', 'in_progress', 'high'),
  ('66666666-6666-6666-6666-666666666666', 'Technical Rider Loading & Sound Check', 'In-venue loading at 10:00 AM sharp', now() + interval '5 days', 'todo', 'urgent'),
  ('77777777-7777-7777-7777-777777777777', 'Vendor Decor Moodboard Approval', 'Review flower arrangements & ambiance palette', now() + interval '3 days', 'todo', 'medium')
on conflict (id) do nothing;

-- 8. RBAC: Roles
insert into public.roles (id, name, description)
values
  ('admin', 'Administrator', 'Akses penuh seluruh konfigurasi sistem, database, dan manajemen hak akses'),
  ('manager', 'Event Manager', 'Pengelolaan operasional acara, klien, vendor, dan delegasi tugas kru'),
  ('staff', 'Kru Operasional', 'Akses eksekusi lapangan, melihat jadwal panggung, dan memperbarui status tugas')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

-- 9. RBAC: Permissions
insert into public.permissions (id, name, description, module)
values
  ('users:manage', 'Kelola Pengguna & Hak Akses', 'Membuat, mengubah, dan menghapus akun staf serta peran RBAC', 'users'),
  ('events:read', 'Lihat Jadwal & Detail Acara', 'Melihat daftar kalender acara dan lembar rundown panggung', 'events'),
  ('events:create', 'Inisialisasi Acara Baru', 'Membuat project event baru beserta rancangan timeline', 'events'),
  ('events:update', 'Perbarui Informasi Acara', 'Mengubah status event, venue, dan alokasi anggaran', 'events'),
  ('events:delete', 'Hapus Data Acara', 'Menghapus arsip event dari sistem operasional', 'events'),
  ('clients:manage', 'Kelola Database Klien', 'Mengelola kontak prinsipal dan PIC korporasi', 'clients'),
  ('vendors:manage', 'Kelola Database Vendor', 'Mengelola direktori mitra audio, lighting, catering, dan panggung', 'vendors'),
  ('tasks:manage', 'Kelola Tugas & Checklist Kru', 'Membuat dan memperbarui status checklist teknis kru', 'tasks'),
  ('team:manage', 'Kelola Tim & Kru', 'Mengelola penugasan anggota tim dan peran kru', 'team'),
  ('rbac:manage', 'Kelola Peran & Hak Akses Sistem', 'Konfigurasi role dan permission pengguna', 'users'),
  ('templates:manage', 'Kelola Template Acara', 'Mengelola master spreadsheet dan template rundown', 'templates'),
  ('finances:manage', 'Kelola Keuangan Acara', 'Mencatat dan memantau anggaran serta rincian biaya', 'finances'),
  ('documents:manage', 'Kelola Berkas & Dokumen Acara', 'Mengunggah dan mengelola dokumen teknis acara', 'documents')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  module = excluded.module;

-- 10. RBAC: Role Permissions
-- Admin gets all permissions
insert into public.role_permissions (role_id, permission_id)
select 'admin', id from public.permissions
on conflict (role_id, permission_id) do nothing;

-- Manager gets event, client, vendor, and task permissions
insert into public.role_permissions (role_id, permission_id)
values
  ('manager', 'events:read'),
  ('manager', 'events:create'),
  ('manager', 'events:update'),
  ('manager', 'clients:manage'),
  ('manager', 'vendors:manage'),
  ('manager', 'tasks:manage'),
  ('manager', 'team:manage'),
  ('manager', 'finances:manage'),
  ('manager', 'documents:manage')
on conflict (role_id, permission_id) do nothing;

-- Staff gets read and task permissions
insert into public.role_permissions (role_id, permission_id)
values
  ('staff', 'events:read'),
  ('staff', 'tasks:manage')
on conflict (role_id, permission_id) do nothing;

-- 11. RBAC: User Roles (Sync from profiles)
insert into public.user_roles (user_id, role_id)
select id, role::text
from public.profiles
where role::text in ('admin', 'manager', 'staff')
on conflict (user_id, role_id) do nothing;

