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
-- 7. MASTER TEMPLATES (DYNAMICALLY MANAGED)
-- ------------------------------------------------------------------------------
-- Note: public.master_templates is 100% dynamic and managed through the UI (/settings/templates).
-- No static master spreadsheet templates are seeded by default.


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
