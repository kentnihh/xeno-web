-- Migration: Add SUPER_ADMIN Role & Setup Impersonation System
-- Date: 2026-10-22

-- 1. Safely add 'SUPER_ADMIN' and 'super_admin' to user_role enum
DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Insert roles into public.roles table
INSERT INTO public.roles (id, name, description)
VALUES 
  ('SUPER_ADMIN', 'Super Administrator', 'Akses tertinggi sistem, bypass seluruh izin, dan otoritas impersonasi pengguna'),
  ('super_admin', 'Super Administrator (System)', 'Akses tertinggi sistem, bypass seluruh izin, dan otoritas impersonasi pengguna')
ON CONFLICT (id) DO UPDATE SET 
  name = excluded.name, 
  description = excluded.description;

-- 3. Give super_admin all existing permissions in public.role_permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'SUPER_ADMIN', id FROM public.permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 'super_admin', id FROM public.permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Update the default admin profile to SUPER_ADMIN
UPDATE profiles
SET role = 'SUPER_ADMIN'
WHERE email = 'admin@xenoent.com';

-- Also ensure public.profiles schema qualifier and fallback updates
UPDATE public.profiles
SET role = 'SUPER_ADMIN', updated_at = now()
WHERE email IN ('admin@xenoent.com', 'admin@admin.com') 
   OR full_name ILIKE '%jonathan%';

-- 5. Ensure user_roles junction table reflects SUPER_ADMIN for admin@xenoent.com
INSERT INTO public.user_roles (user_id, role_id)
SELECT id, 'SUPER_ADMIN' FROM public.profiles
WHERE email IN ('admin@xenoent.com', 'admin@admin.com') 
   OR full_name ILIKE '%jonathan%'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 6. Update is_admin() function to include super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
      AND (lower(role::text) = 'admin' OR lower(role::text) = 'super_admin')
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
      AND (lower(role_id) = 'admin' OR lower(role_id) = 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

-- 7. Create is_super_admin() helper function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
      AND lower(role::text) = 'super_admin'
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
      AND lower(role_id) = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;
