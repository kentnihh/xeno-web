-- Supabase Migration: Prevent Privilege Escalation & Self-Role Elevation
-- Description: Enforces database-level triggers to lock down role updates on profiles and user_roles.

-- 1. Prevent unauthorized role tampering on profiles table
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  caller_role text;
  jwt_role text;
BEGIN
  -- Check if the role column is being changed
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- If executed via service_role (e.g. Supabase Admin API / backend migrations), allow
    BEGIN
      jwt_role := current_setting('request.jwt.claim.role', true);
    EXCEPTION WHEN OTHERS THEN
      jwt_role := NULL;
    END;

    IF jwt_role = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- If direct DB maintenance/superuser session (like psql / CLI), allow
    IF current_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    -- If no user is authenticated (and not service_role), block
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Akses ditolak: Autentikasi diperlukan.';
    END IF;

    -- Fetch caller's current role from profiles
    SELECT role::text INTO caller_role FROM public.profiles WHERE id = auth.uid();
    
    -- Only SUPER_ADMIN or ADMIN are allowed to modify roles
    IF UPPER(caller_role) NOT IN ('SUPER_ADMIN', 'ADMIN') THEN
      RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki izin untuk mengubah peran.';
    END IF;

    -- Prevent self-role modification (users cannot change their own role)
    IF NEW.id = auth.uid() THEN
      RAISE EXCEPTION 'Akses ditolak: Anda tidak dapat mengubah peran akun Anda sendiri.';
    END IF;

    -- Prevent regular ADMIN from elevating anyone to SUPER_ADMIN
    IF UPPER(NEW.role::text) = 'SUPER_ADMIN' AND UPPER(caller_role) != 'SUPER_ADMIN' THEN
      RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang dapat menugaskan peran Super Admin.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_escalation();

-- 2. Prevent unauthorized role assignment in user_roles table
CREATE OR REPLACE FUNCTION public.prevent_user_roles_escalation()
RETURNS TRIGGER AS $$
DECLARE
  caller_role text;
  jwt_role text;
BEGIN
  BEGIN
    jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    jwt_role := NULL;
  END;

  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF current_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Autentikasi diperlukan.';
  END IF;

  SELECT role::text INTO caller_role FROM public.profiles WHERE id = auth.uid();
  
  IF UPPER(caller_role) NOT IN ('SUPER_ADMIN', 'ADMIN') THEN
    RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki izin untuk mengelola peran pengguna.';
  END IF;

  -- Prevent self-role assignment
  IF NEW.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Akses ditolak: Anda tidak dapat mengubah peran akun Anda sendiri.';
  END IF;

  -- Prevent standard ADMIN from assigning SUPER_ADMIN
  IF (UPPER(NEW.role_id) = 'SUPER_ADMIN' OR UPPER(NEW.role_id) = 'SUPER_ADMINISTRATOR') AND UPPER(caller_role) != 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang dapat menugaskan peran Super Admin.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_user_roles_escalation ON public.user_roles;
CREATE TRIGGER trg_prevent_user_roles_escalation
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_roles_escalation();
