-- ==============================================================================
-- XENO ENTERTAINMENT - CANONICAL PRODUCTION SEED DATA (Single Source of Truth)
--
-- Configures:
-- 1. System Cleanup: Guarantee removal of duplicate/legacy super admin entries from roles
-- 2. Auth Users Sync: Confirm emails & map production profiles (Jonathan, Edja, Vinna)
-- 3. Super Admin Assignment: Explicitly assign admin@xenoent.com to role = 'SUPER_ADMIN'
-- 4. RBAC Roles: Strictly 3 manageable operational roles (admin, manager, staff)
-- 5. RBAC Permissions: 16 comprehensive granular system permissions
-- 6. Role Permissions Mapping: Default permissions for admin, manager, and staff
-- 7. User Roles Sync: Map operational admin/staff accounts into user_roles
-- 8. Master Templates Blueprint: 9 standard operational spreadsheet templates
-- 9. Master Family Template Blueprint: Default categories & fields for public forms
--
-- Note: Operational tables (clients, vendors, events, event_tasks, event_vendors, 
-- event_crew, event_expenses, event_documents) remain 100% clean for production.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SYSTEM CLEANUP (REMOVE DUPLICATE / LEGACY SUPER ADMIN ROLE RECORDS)
-- ------------------------------------------------------------------------------
DELETE FROM public.role_permissions 
WHERE lower(role_id) IN ('super_admin', 'superadmin')
   OR role_id IN (
     SELECT id FROM public.roles 
     WHERE lower(id) IN ('super_admin', 'superadmin') OR name ILIKE '%Super Administrator%'
   );

DELETE FROM public.user_roles 
WHERE lower(role_id) IN ('super_admin', 'superadmin');

DELETE FROM public.roles 
WHERE lower(id) IN ('super_admin', 'superadmin')
   OR name ILIKE '%Super Administrator%';

-- ------------------------------------------------------------------------------
-- 2. AUTH USERS CONFIRMATION & PROFILE SYNC
-- ------------------------------------------------------------------------------
-- Auto-confirm any initial accounts in auth.users
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;

-- Upsert production profiles with designated roles
INSERT INTO public.profiles (id, full_name, email, role, avatar_color)
SELECT 
  id, 
  CASE 
    WHEN email = 'admin@xenoent.com' THEN 'Jonathan Kent'
    WHEN email = 'edjamoo@xenoent.com' THEN 'Edja'
    WHEN email = 'vinna@xenoent.com' THEN 'Vinna'
    ELSE coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
  END, 
  email, 
  CASE 
    WHEN email IN ('admin@admin.com', 'admin@xenoent.com') THEN 'SUPER_ADMIN'::user_role
    WHEN email IN ('edjamoo@xenoent.com', 'vinna@xenoent.com') THEN 'admin'::user_role
    ELSE 'staff'::user_role
  END,
  CASE
    WHEN email = 'admin@xenoent.com' THEN '#007aff'
    ELSE NULL
  END
FROM auth.users
WHERE email IN ('admin@xenoent.com', 'edjamoo@xenoent.com', 'vinna@xenoent.com')
ON CONFLICT (id) DO UPDATE SET 
  role = excluded.role,
  full_name = excluded.full_name,
  avatar_color = coalesce(excluded.avatar_color, public.profiles.avatar_color),
  updated_at = now();

-- Ensure admin@xenoent.com is explicitly SUPER_ADMIN
UPDATE public.profiles
SET role = 'SUPER_ADMIN', updated_at = now()
WHERE email = 'admin@xenoent.com';

-- ------------------------------------------------------------------------------
-- 3. RBAC: ROLES (STRICTLY 3 MANAGEABLE OPERATIONAL ROLES)
-- ------------------------------------------------------------------------------
INSERT INTO public.roles (id, name, description)
VALUES
  ('admin', 'Administrator', 'Akses penuh seluruh konfigurasi sistem, database, dan manajemen hak akses'),
  ('manager', 'Event Manager', 'Pengelolaan operasional acara, klien, vendor, dan delegasi tugas kru'),
  ('staff', 'Kru Operasional', 'Akses eksekusi lapangan, melihat jadwal panggung, dan memperbarui status tugas')
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  description = excluded.description;

-- ------------------------------------------------------------------------------
-- 4. RBAC: PERMISSIONS (16 GRANULAR SYSTEM PERMISSIONS)
-- ------------------------------------------------------------------------------
INSERT INTO public.permissions (id, name, description, module)
VALUES
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
  ('documents:manage', 'Kelola Berkas & Dokumen Acara', 'Mengunggah dan mengelola dokumen teknis acara', 'documents'),
  ('events:operations:manage', 'Kelola Operasional Acara', 'Mengelola penugasan kru, checklist tugas, dan vendor acara', 'events'),
  ('events:sheets:manage', 'Kelola Lembar Kerja Acara', 'Mengedit dan mengelola lembar kerja acara', 'events'),
  ('events:family:manage', 'Kelola Data Keluarga Acara', 'Mengonfigurasi formulir dan mengelola data keluarga acara', 'events')
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  module = excluded.module;

-- ------------------------------------------------------------------------------
-- 5. RBAC: ROLE PERMISSIONS MAPPING
-- ------------------------------------------------------------------------------
-- Admin gets all permissions (Super Admin bypasses all checks via auth layer)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'admin', id FROM public.permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager gets operational and management permissions
INSERT INTO public.role_permissions (role_id, permission_id)
VALUES
  ('manager', 'events:read'),
  ('manager', 'events:create'),
  ('manager', 'events:update'),
  ('manager', 'clients:manage'),
  ('manager', 'vendors:manage'),
  ('manager', 'tasks:manage'),
  ('manager', 'team:manage'),
  ('manager', 'finances:manage'),
  ('manager', 'documents:manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff gets field execution and reading permissions
INSERT INTO public.role_permissions (role_id, permission_id)
VALUES
  ('staff', 'events:read'),
  ('staff', 'tasks:manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 6. RBAC: USER ROLES SYNC
-- ------------------------------------------------------------------------------
-- Sync operational profiles into user_roles (excluding SUPER_ADMIN system role)
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, p.role::text
FROM public.profiles p
JOIN public.roles r ON r.id = p.role::text
WHERE p.email IN ('admin@xenoent.com', 'edjamoo@xenoent.com', 'vinna@xenoent.com')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 7. PRODUCTION MASTER TEMPLATES (9 OPERATIONAL SPREADSHEETS)
-- ------------------------------------------------------------------------------
INSERT INTO public.master_templates (sheet_name, order_index, sort_order, jsonb_structure)
VALUES
  ('CHECKLIST', 0, 0, '{"columns":[{"id":"col_1","name":"No"},{"id":"col_2","name":"Item Checklist"},{"id":"col_3","name":"Kategori"},{"id":"col_4","name":"PIC"},{"id":"col_5","name":"Status"},{"id":"col_6","name":"Catatan"}],"rows":[{"id":"row_1","col_1":"1","col_2":"Sound system test & mic wireless","col_3":"Teknis","col_4":"Budi","col_5":"Done","col_6":"Semua 4 mic aman"},{"id":"row_2","col_1":"2","col_2":"Lighting panggung utama & ambience","col_3":"Teknis","col_4":"Agus","col_5":"In Progress","col_6":"Spotlight standby"},{"id":"row_3","col_1":"3","col_2":"Souvenir VIP & meja registrasi","col_3":"Front Desk","col_4":"Siti","col_5":"Ready","col_6":"200 pax siap"},{"id":"row_4","col_1":"4","col_2":"Koordinasi Catering & Test Food","col_3":"F&B","col_4":"Rian","col_5":"Done","col_6":"Menu fix"},{"id":"row_5","col_1":"5","col_2":"Gladi resik / Rundown walk-through","col_3":"Program","col_4":"Team","col_5":"Pending","col_6":"Jam 16:00"}]}'::jsonb),
  ('Meja VIP resepsi', 1, 1, '{"columns":[{"id":"col_1","name":"No Meja"},{"id":"col_2","name":"Nama Tamu / VIP"},{"id":"col_3","name":"Instansi / Hubungan"},{"id":"col_4","name":"Jumlah Pax"},{"id":"col_5","name":"Keterangan Meja"},{"id":"col_6","name":"Status Kehadiran"}],"rows":[{"id":"row_1","col_1":"VIP 01","col_2":"Bpk. Hendra & Ibu","col_3":"Keluarga Utama","col_4":"4","col_5":"Dekat Panggung","col_6":"Konfirmasi"},{"id":"row_2","col_1":"VIP 02","col_2":"Direksi PT Sinar Abadi","col_3":"Rekan Bisnis","col_4":"6","col_5":"Baris Depan Kiri","col_6":"Konfirmasi"},{"id":"row_3","col_1":"VIP 03","col_2":"Bpk. Walikota & Rombongan","col_3":"Pejabat Daerah","col_4":"8","col_5":"Protokoler VIP","col_6":"Menunggu Info"}]}'::jsonb),
  ('Reception Rundown', 2, 2, '{"columns":[{"id":"col_1","name":"Waktu"},{"id":"col_2","name":"Durasi"},{"id":"col_3","name":"Aktivitas / Acara"},{"id":"col_4","name":"Pengisi / PIC"},{"id":"col_5","name":"Audio / Video Cue"},{"id":"col_6","name":"Keterangan"}],"rows":[{"id":"row_1","col_1":"18:00 - 18:30","col_2":"30 mnt","col_3":"Registrasi & Welcoming Drink","col_4":"Front Desk & LO","col_5":"Instrumental Jazz","col_6":"Pintu Ballroom buka"},{"id":"row_2","col_1":"18:30 - 18:45","col_2":"15 mnt","col_3":"Grand Entrance Pengantin / VIP","col_4":"MC & Wedding Organizer","col_5":"Theme Song Entrance","col_6":"Spotlight follow"},{"id":"row_3","col_1":"18:45 - 19:15","col_2":"30 mnt","col_3":"Sambutan & Toast Bersama","col_4":"Perwakilan Keluarga","col_5":"Microphone Center","col_6":"Gelas champagne ready"},{"id":"row_4","col_1":"19:15 - 20:30","col_2":"75 mnt","col_3":"Dinner & Live Band Performance","col_4":"Band Talent & Catering","col_5":"Live Performance","col_6":"Buffet dibuka"}]}'::jsonb),
  ('List Teapai', 3, 3, '{"columns":[{"id":"col_1","name":"No"},{"id":"col_2","name":"Nama Pasangan / Tetua"},{"id":"col_3","name":"Pihak (Groom/Bride)"},{"id":"col_4","name":"Sebutan / Hubungan"},{"id":"col_5","name":"PIC Angpau / Baki"},{"id":"col_6","name":"Status Selesai"}],"rows":[{"id":"row_1","col_1":"1","col_2":"Kakek & Nenek Pria","col_3":"Groom","col_4":"Yeye & Nainai","col_5":"Lisa","col_6":"Siap"},{"id":"row_2","col_1":"2","col_2":"Kakek & Nenek Wanita","col_3":"Bride","col_4":"Akong & Amah","col_5":"Lisa","col_6":"Siap"},{"id":"row_3","col_1":"3","col_2":"Orang Tua Pria","col_3":"Groom","col_4":"Papa & Mama","col_5":"Dewi","col_6":"Siap"},{"id":"row_4","col_1":"4","col_2":"Orang Tua Wanita","col_3":"Bride","col_4":"Papa & Mama","col_5":"Dewi","col_6":"Siap"}]}'::jsonb),
  ('LO Resepsi', 4, 4, '{"columns":[{"id":"col_1","name":"Nama Petugas LO"},{"id":"col_2","name":"Tugas Khusus / Pendamping"},{"id":"col_3","name":"No HT / Kontak"},{"id":"col_4","name":"Posisi Standby"},{"id":"col_5","name":"Jam Standby"},{"id":"col_6","name":"Catatan"}],"rows":[{"id":"row_1","col_1":"Andi Pratama","col_2":"LO Pengantin Pria","col_3":"CH 1 / 0812-xxx","col_4":"Ruang Rias Groom","col_5":"15:00","col_6":"Bawa jas ganti & air mineral"},{"id":"row_2","col_1":"Nadia Utami","col_2":"LO Pengantin Wanita","col_3":"CH 1 / 0813-xxx","col_4":"Bridal Suite","col_5":"15:00","col_6":"Touch up kit standby"},{"id":"row_3","col_1":"Farhan","col_2":"LO VIP & Orang Tua","col_3":"CH 2 / 0817-xxx","col_4":"Holding Room VIP","col_5":"17:00","col_6":"Korsase disematkan"}]}'::jsonb),
  ('F&B Resepsi', 5, 5, '{"columns":[{"id":"col_1","name":"Menu / Stall"},{"id":"col_2","name":"Vendor Penyedia"},{"id":"col_3","name":"Target Pax"},{"id":"col_4","name":"Waktu Keluar"},{"id":"col_5","name":"Lokasi Stall"},{"id":"col_6","name":"Status Refill"}],"rows":[{"id":"row_1","col_1":"Main Buffet Nusantara","col_2":"Hotel Catering","col_3":"500 pax","col_4":"19:00","col_5":"Buffet A & B","col_6":"Ready"},{"id":"row_2","col_1":"Zuppa Soup","col_2":"Vendor Rasa Prima","col_3":"300 porsi","col_4":"18:45","col_5":"Stall Kiri 1","col_6":"Ready"},{"id":"row_3","col_1":"Roast Beef","col_2":"Vendor Rasa Prima","col_3":"250 porsi","col_4":"18:45","col_5":"Stall Kiri 2","col_6":"Standby"}]}'::jsonb),
  ('Event Resepsi', 6, 6, '{"columns":[{"id":"col_1","name":"Item Acara"},{"id":"col_2","name":"Pengisi / Vendor"},{"id":"col_3","name":"Area / Panggung"},{"id":"col_4","name":"Kebutuhan Alat"},{"id":"col_5","name":"Catatan Teknis"}],"rows":[{"id":"row_1","col_1":"Wedding Cake Cutting","col_2":"Cake Vendor & MC","col_3":"Stage Center","col_4":"Pisau hias & lap","col_5":"Spotlight 80%"},{"id":"row_2","col_1":"Champagne Toast","col_2":"MC & Bartender","col_3":"Stage Center","col_4":"Piramida gelas","col_5":"Botol siap buka"}]}'::jsonb),
  ('front desk', 7, 7, '{"columns":[{"id":"col_1","name":"Meja Registrasi"},{"id":"col_2","name":"Petugas Jaga"},{"id":"col_3","name":"Souvenir"},{"id":"col_4","name":"Kotak Angpau"},{"id":"col_5","name":"Status Kunci"}],"rows":[{"id":"row_1","col_1":"Meja 1 (A - M)","col_2":"Jessica & Cindy","col_3":"150 pcs","col_4":"Kotak A (Terkunci)","col_5":"Kunci di Ibu Rita"},{"id":"row_2","col_1":"Meja 2 (N - Z)","col_2":"Maya & Devi","col_3":"150 pcs","col_4":"Kotak B (Terkunci)","col_5":"Kunci di Ibu Rita"},{"id":"row_3","col_1":"Meja VIP","col_2":"Tania & Kevin","col_3":"50 pcs VIP","col_4":"Kotak VIP (Terkunci)","col_5":"Kunci di Bpk. Hendra"}]}'::jsonb),
  ('Hotel Room Reception', 8, 8, '{"columns":[{"id":"col_1","name":"No Kamar"},{"id":"col_2","name":"Tipe Kamar"},{"id":"col_3","name":"Nama Penghuni"},{"id":"col_4","name":"Check-in"},{"id":"col_5","name":"Check-out"},{"id":"col_6","name":"Kunci / Kartu"}],"rows":[{"id":"row_1","col_1":"Room 1201","col_2":"Presidential Suite","col_3":"Pengantin","col_4":"14:00 (Hari H-1)","col_5":"12:00 (Hari H+1)","col_6":"2 Kartu Aktif"},{"id":"row_2","col_1":"Room 1105","col_2":"Deluxe Suite","col_3":"Orang Tua Pria","col_4":"14:00 (Hari H-1)","col_5":"12:00 (Hari H+1)","col_6":"2 Kartu Aktif"},{"id":"row_3","col_1":"Room 1106","col_2":"Deluxe Suite","col_3":"Orang Tua Wanita","col_4":"14:00 (Hari H-1)","col_5":"12:00 (Hari H+1)","col_6":"2 Kartu Aktif"}]}'::jsonb)
ON CONFLICT (sheet_name) DO UPDATE SET 
  order_index = excluded.order_index, 
  sort_order = excluded.sort_order,
  jsonb_structure = excluded.jsonb_structure, 
  updated_at = now();

-- ------------------------------------------------------------------------------
-- 8. MASTER FAMILY TEMPLATES BLUEPRINT
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.master_family_templates) THEN
    INSERT INTO public.master_family_templates (id, name, categories, is_active)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Master Template Data Keluarga',
      '[
        {
          "id": "cat_1",
          "name": "Keluarga Utama Mempelai Pria",
          "description": "Orang tua, kakek-nenek, dan saudara kandung mempelai pria",
          "fields": [
            {"id": "f_1", "name": "Nama Lengkap", "type": "text", "required": true},
            {"id": "f_2", "name": "Hubungan / Status", "type": "text", "required": true},
            {"id": "f_3", "name": "No. Telepon / WhatsApp", "type": "text", "required": false}
          ]
        },
        {
          "id": "cat_2",
          "name": "Keluarga Utama Mempelai Wanita",
          "description": "Orang tua, kakek-nenek, dan saudara kandung mempelai wanita",
          "fields": [
            {"id": "f_4", "name": "Nama Lengkap", "type": "text", "required": true},
            {"id": "f_5", "name": "Hubungan / Status", "type": "text", "required": true},
            {"id": "f_6", "name": "No. Telepon / WhatsApp", "type": "text", "required": false}
          ]
        },
        {
          "id": "cat_3",
          "name": "Perwakilan Sesi Foto / VIP",
          "description": "Daftar rombongan keluarga yang dipanggil pada sesi foto panggung",
          "fields": [
            {"id": "f_7", "name": "Nama Rombongan / Keluarga", "type": "text", "required": true},
            {"id": "f_8", "name": "Estimasi Pax", "type": "number", "required": false},
            {"id": "f_9", "name": "PIC Pendamping", "type": "text", "required": false}
          ]
        }
      ]'::jsonb,
      true
    );
  END IF;
END $$;
