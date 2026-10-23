-- ==============================================================================
-- Migration: Add Granular Event Permissions & Ensure RBAC Read Policies
-- Date: 2026-10-23
-- 
-- Adds granular permissions:
-- 1. events:operations:manage - Operasional Acara (Kru, Checklist Tugas, Vendor)
-- 2. events:sheets:manage - Lembar Kerja Spreadsheet Acara
-- 3. events:family:manage - Formulir & Data Keluarga Acara
-- ==============================================================================

-- 1. Insert granular permissions into public.permissions
INSERT INTO public.permissions (id, name, description, module)
VALUES
  (
    'events:operations:manage',
    'Kelola Operasional Acara',
    'Mengelola penugasan kru, checklist tugas, dan vendor acara',
    'events'
  ),
  (
    'events:sheets:manage',
    'Kelola Lembar Kerja Acara',
    'Mengedit dan mengelola lembar kerja acara',
    'events'
  ),
  (
    'events:family:manage',
    'Kelola Data Keluarga Acara',
    'Mengonfigurasi formulir dan mengelola data keluarga acara',
    'events'
  )
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  module = excluded.module;

-- 2. Grant new permissions to SUPER_ADMIN, super_admin, and admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.id
FROM (VALUES ('SUPER_ADMIN'), ('super_admin'), ('admin')) AS r(role_id)
CROSS JOIN (
  VALUES
    ('events:operations:manage'),
    ('events:sheets:manage'),
    ('events:family:manage')
) AS p(id)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. Ensure SELECT policies exist for authenticated users on RBAC tables
-- so permission resolution queries succeed for all authenticated roles.
DROP POLICY IF EXISTS "Role perms select" ON public.role_permissions;
CREATE POLICY "Role perms select"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Permissions select" ON public.permissions;
CREATE POLICY "Permissions select"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Roles select" ON public.roles;
CREATE POLICY "Roles select"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "User roles select" ON public.user_roles;
CREATE POLICY "User roles select"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);
