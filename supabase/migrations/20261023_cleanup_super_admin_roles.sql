-- ==============================================================================
-- Migration: Cleanup SUPER_ADMIN from Roles Table and Clean Duplicate Entries
--
-- Description:
-- 1. SUPER_ADMIN is a hardcoded system role handled via profiles.role that bypasses
--    all RBAC checks automatically.
-- 2. It should NOT be stored as a manageable role in the roles or role_permissions table.
-- 3. Only operational manageable roles (admin, manager, staff) should reside in roles.
-- 4. Clean up duplicate SUPER_ADMIN / super_admin records.
-- 5. Ensure admin@xenoent.com remains explicitly assigned to role = 'SUPER_ADMIN' in profiles.
-- ==============================================================================

-- 1. Remove duplicate/redundant role records for SUPER_ADMIN from role_permissions
DELETE FROM public.role_permissions 
WHERE lower(role_id) IN ('super_admin', 'superadmin')
   OR role_id IN (
     SELECT id FROM public.roles 
     WHERE lower(id) IN ('super_admin', 'superadmin') OR name ILIKE '%Super Administrator%'
   );

-- 2. Clean up any user_roles assignments referencing super admin role IDs
DELETE FROM public.user_roles 
WHERE lower(role_id) IN ('super_admin', 'superadmin');

-- 3. Delete SUPER_ADMIN and duplicate records from roles table
DELETE FROM public.roles 
WHERE lower(id) IN ('super_admin', 'superadmin')
   OR name ILIKE '%Super Administrator%';

-- 4. Ensure admin@xenoent.com is explicitly SUPER_ADMIN in profiles table
UPDATE public.profiles 
SET role = 'SUPER_ADMIN', updated_at = now() 
WHERE email = 'admin@xenoent.com';
