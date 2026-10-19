-- ==============================================================================
-- Clean Production Seed Data for Xeno Entertainment
-- 
-- Configures:
-- 1. Production Users Sync: Jonathan Kent, Edja & Vinna (Admin)
-- 2. RBAC System: Roles, Permissions, Role-Permission mappings
-- 3. Production Master Templates: 10 operational spreadsheet master templates
-- 
-- Note: Operational tables (clients, vendors, events, event_tasks, event_vendors, 
-- event_crew) are left completely clean for production.
-- ==============================================================================

-- 1. Auto-confirm any initial accounts in auth.users
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- 2. Sync profiles for production accounts with designated Administrator role
insert into public.profiles (id, full_name, email, role)
select 
  id, 
  case 
    when email = 'admin@admin.com' then 'Jonathan Kent'
    when email = 'edjamoo@xenoent.com' then 'Edja'
    when email = 'vinna@xenoent.com' then 'Vinna'
    else coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
  end, 
  email, 
  case 
    when email in ('admin@admin.com', 'edjamoo@xenoent.com', 'vinna@xenoent.com') then 'admin'::user_role
    else 'staff'::user_role
  end
from auth.users
where email in ('admin@admin.com', 'edjamoo@xenoent.com', 'vinna@xenoent.com')
on conflict (id) do update set 
  role = excluded.role,
  full_name = excluded.full_name;

-- 3. RBAC: Roles
insert into public.roles (id, name, description)
values
  ('admin', 'Administrator', 'Akses penuh seluruh konfigurasi sistem, database, dan manajemen hak akses'),
  ('manager', 'Event Manager', 'Pengelolaan operasional acara, klien, vendor, dan delegasi tugas kru'),
  ('staff', 'Kru Operasional', 'Akses eksekusi lapangan, melihat jadwal panggung, dan memperbarui status tugas')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

-- 4. RBAC: System Permissions (13 standard modules)
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

-- 5. RBAC: Role Permissions Mapping
-- Admin gets all permissions
insert into public.role_permissions (role_id, permission_id)
select 'admin', id from public.permissions
on conflict (role_id, permission_id) do nothing;

-- Manager gets operational and management permissions
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

-- Staff gets field execution and reading permissions
insert into public.role_permissions (role_id, permission_id)
values
  ('staff', 'events:read'),
  ('staff', 'tasks:manage')
on conflict (role_id, permission_id) do nothing;

-- 6. RBAC: User Roles (Sync from production admin profiles)
insert into public.user_roles (user_id, role_id)
select id, role::text
from public.profiles
where email in ('admin@admin.com', 'edjamoo@xenoent.com', 'vinna@xenoent.com')
on conflict (user_id, role_id) do nothing;

-- 7. Production Master Templates (9 standard operational templates)
insert into public.master_templates (sheet_name, order_index, jsonb_structure)
values
  ('CHECKLIST', 0, '{"columns":[{"id":"col_1","name":"No"},{"id":"col_2","name":"Item Checklist"},{"id":"col_3","name":"Kategori"},{"id":"col_4","name":"PIC"},{"id":"col_5","name":"Status"},{"id":"col_6","name":"Catatan"}],"rows":[{"id":"row_1","col_1":"1","col_2":"Sound system test & mic wireless","col_3":"Teknis","col_4":"Budi","col_5":"Done","col_6":"Semua 4 mic aman"},{"id":"row_2","col_1":"2","col_2":"Lighting panggung utama & ambience","col_3":"Teknis","col_4":"Agus","col_5":"In Progress","col_6":"Spotlight standby"},{"id":"row_3","col_1":"3","col_2":"Souvenir VIP & meja registrasi","col_3":"Front Desk","col_4":"Siti","col_5":"Ready","col_6":"200 pax siap"},{"id":"row_4","col_1":"4","col_2":"Koordinasi Catering & Test Food","col_3":"F&B","col_4":"Rian","col_5":"Done","col_6":"Menu fix"},{"id":"row_5","col_1":"5","col_2":"Gladi resik / Rundown walk-through","col_3":"Program","col_4":"Team","col_5":"Pending","col_6":"Jam 16:00"}]}'::jsonb),
  ('Meja VIP resepsi', 1, '{"columns":[{"id":"col_1","name":"No Meja"},{"id":"col_2","name":"Nama Tamu / VIP"},{"id":"col_3","name":"Instansi / Hubungan"},{"id":"col_4","name":"Jumlah Pax"},{"id":"col_5","name":"Keterangan Meja"},{"id":"col_6","name":"Status Kehadiran"}],"rows":[{"id":"row_1","col_1":"VIP 01","col_2":"Bpk. Hendra & Ibu","col_3":"Keluarga Utama","col_4":"4","col_5":"Dekat Panggung","col_6":"Konfirmasi"},{"id":"row_2","col_1":"VIP 02","col_2":"Direksi PT Sinar Abadi","col_3":"Rekan Bisnis","col_4":"6","col_5":"Baris Depan Kiri","col_6":"Konfirmasi"},{"id":"row_3","col_1":"VIP 03","col_2":"Bpk. Walikota & Rombongan","col_3":"Pejabat Daerah","col_4":"8","col_5":"Protokoler VIP","col_6":"Menunggu Info"}]}'::jsonb),
  ('Reception Rundown', 2, '{"columns":[{"id":"col_1","name":"Waktu"},{"id":"col_2","name":"Durasi"},{"id":"col_3","name":"Aktivitas / Acara"},{"id":"col_4","name":"Pengisi / PIC"},{"id":"col_5","name":"Audio / Video Cue"},{"id":"col_6","name":"Keterangan"}],"rows":[{"id":"row_1","col_1":"18:00 - 18:30","col_2":"30 mnt","col_3":"Registrasi & Welcoming Drink","col_4":"Front Desk & LO","col_5":"Instrumental Jazz","col_6":"Pintu Ballroom buka"},{"id":"row_2","col_1":"18:30 - 18:45","col_2":"15 mnt","col_3":"Grand Entrance Pengantin / VIP","col_4":"MC & Wedding Organizer","col_5":"Theme Song Entrance","col_6":"Spotlight follow"},{"id":"row_3","col_1":"18:45 - 19:15","col_2":"30 mnt","col_3":"Sambutan & Toast Bersama","col_4":"Perwakilan Keluarga","col_5":"Microphone Center","col_6":"Gelas champagne ready"},{"id":"row_4","col_1":"19:15 - 20:30","col_2":"75 mnt","col_3":"Dinner & Live Band Performance","col_4":"Band Talent & Catering","col_5":"Live Performance","col_6":"Buffet dibuka"}]}'::jsonb),
  ('List Teapai', 3, '{"columns":[{"id":"col_1","name":"No"},{"id":"col_2","name":"Nama Pasangan / Tetua"},{"id":"col_3","name":"Pihak (Groom/Bride)"},{"id":"col_4","name":"Sebutan / Hubungan"},{"id":"col_5","name":"PIC Angpau / Baki"},{"id":"col_6","name":"Status Selesai"}],"rows":[{"id":"row_1","col_1":"1","col_2":"Kakek & Nenek Pria","col_3":"Groom","col_4":"Yeye & Nainai","col_5":"Lisa","col_6":"Siap"},{"id":"row_2","col_1":"2","col_2":"Kakek & Nenek Wanita","col_3":"Bride","col_4":"Akong & Amah","col_5":"Lisa","col_6":"Siap"},{"id":"row_3","col_1":"3","col_2":"Orang Tua Pria","col_3":"Groom","col_4":"Papa & Mama","col_5":"Dewi","col_6":"Siap"},{"id":"row_4","col_1":"4","col_2":"Orang Tua Wanita","col_3":"Bride","col_4":"Papa & Mama","col_5":"Dewi","col_6":"Siap"}]}'::jsonb),
  ('LO Resepsi', 4, '{"columns":[{"id":"col_1","name":"Nama Petugas LO"},{"id":"col_2","name":"Tugas Khusus / Pendamping"},{"id":"col_3","name":"No HT / Kontak"},{"id":"col_4","name":"Posisi Standby"},{"id":"col_5","name":"Jam Standby"},{"id":"col_6","name":"Catatan"}],"rows":[{"id":"row_1","col_1":"Andi Pratama","col_2":"LO Pengantin Pria","col_3":"CH 1 / 0812-xxx","col_4":"Ruang Rias Groom","col_5":"15:00","col_6":"Bawa jas ganti & air mineral"},{"id":"row_2","col_1":"Nadia Utami","col_2":"LO Pengantin Wanita","col_3":"CH 1 / 0813-xxx","col_4":"Bridal Suite","col_5":"15:00","col_6":"Touch up kit standby"},{"id":"row_3","col_1":"Farhan","col_2":"LO VIP & Orang Tua","col_3":"CH 2 / 0817-xxx","col_4":"Holding Room VIP","col_5":"17:00","col_6":"Korsase disematkan"}]}'::jsonb),
  ('F&B Resepsi', 5, '{"columns":[{"id":"col_1","name":"Menu / Stall"},{"id":"col_2","name":"Vendor Penyedia"},{"id":"col_3","name":"Target Pax"},{"id":"col_4","name":"Waktu Keluar"},{"id":"col_5","name":"Lokasi Stall"},{"id":"col_6","name":"Status Refill"}],"rows":[{"id":"row_1","col_1":"Main Buffet Nusantara","col_2":"Hotel Catering","col_3":"500 pax","col_4":"19:00","col_5":"Buffet A & B","col_6":"Ready"},{"id":"row_2","col_1":"Zuppa Soup","col_2":"Vendor Rasa Prima","col_3":"300 porsi","col_4":"18:45","col_5":"Stall Kiri 1","col_6":"Ready"},{"id":"row_3","col_1":"Roast Beef","col_2":"Vendor Rasa Prima","col_3":"250 porsi","col_4":"18:45","col_5":"Stall Kiri 2","col_6":"Standby"}]}'::jsonb),
  ('Event Resepsi', 6, '{"columns":[{"id":"col_1","name":"Item Acara"},{"id":"col_2","name":"Pengisi / Vendor"},{"id":"col_3","name":"Area / Panggung"},{"id":"col_4","name":"Kebutuhan Alat"},{"id":"col_5","name":"Catatan Teknis"}],"rows":[{"id":"row_1","col_1":"Wedding Cake Cutting","col_2":"Cake Vendor & MC","col_3":"Stage Center","col_4":"Pisau hias & lap","col_5":"Spotlight 80%"},{"id":"row_2","col_1":"Champagne Toast","col_2":"MC & Bartender","col_3":"Stage Center","col_4":"Piramida gelas","col_5":"Botol siap buka"}]}'::jsonb),
  ('front desk', 7, '{"columns":[{"id":"col_1","name":"Meja Registrasi"},{"id":"col_2","name":"Petugas Jaga"},{"id":"col_3","name":"Souvenir"},{"id":"col_4","name":"Kotak Angpau"},{"id":"col_5","name":"Status Kunci"}],"rows":[{"id":"row_1","col_1":"Meja 1 (A - M)","col_2":"Jessica & Cindy","col_3":"150 pcs","col_4":"Kotak A (Terkunci)","col_5":"Kunci di Ibu Rita"},{"id":"row_2","col_1":"Meja 2 (N - Z)","col_2":"Maya & Devi","col_3":"150 pcs","col_4":"Kotak B (Terkunci)","col_5":"Kunci di Ibu Rita"},{"id":"row_3","col_1":"Meja VIP","col_2":"Tania & Kevin","col_3":"50 pcs VIP","col_4":"Kotak VIP (Terkunci)","col_5":"Kunci di Bpk. Hendra"}]}'::jsonb),
  ('Hotel Room Reception', 8, '{"columns":[{"id":"col_1","name":"No Kamar"},{"id":"col_2","name":"Tipe Kamar"},{"id":"col_3","name":"Nama Penghuni"},{"id":"col_4","name":"Check-in"},{"id":"col_5","name":"Check-out"},{"id":"col_6","name":"Kunci / Kartu"}],"rows":[{"id":"row_1","col_1":"Room 1201","col_2":"Presidential Suite","col_3":"Pengantin","col_4":"14:00 (Hari H-1)","col_5":"12:00 (Hari H+1)","col_6":"2 Kartu Aktif"},{"id":"row_2","col_1":"Room 1105","col_2":"Deluxe Suite","col_3":"Orang Tua Pria","col_4":"14:00 (Hari H-1)","col_5":"12:00 (Hari H+1)","col_6":"2 Kartu Aktif"},{"id":"row_3","col_1":"Room 1106","col_2":"Deluxe Suite","col_3":"Orang Tua Wanita","col_4":"14:00 (Hari H-1)","col_5":"12:00 (Hari H+1)","col_6":"2 Kartu Aktif"}]}'::jsonb)
on conflict (sheet_name) do update 
set 
  order_index = excluded.order_index, 
  jsonb_structure = excluded.jsonb_structure, 
  updated_at = now();
