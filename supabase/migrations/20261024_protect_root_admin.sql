-- Supabase Migration: Immutable Protection for Root Super Admin (admin@xenoent.com)
-- Description: Protects the primary root admin account against unauthorized deletion, role downgrades, or tampering.

CREATE OR REPLACE FUNCTION public.protect_root_admin_account()
RETURNS TRIGGER AS $$
DECLARE
  caller_email text;
  jwt_role text;
BEGIN
  -- Check if the target being modified or deleted is the root admin
  IF OLD.email = 'admin@xenoent.com' THEN
    -- If executed via service_role or database maintenance session, allow
    BEGIN
      jwt_role := current_setting('request.jwt.claim.role', true);
    EXCEPTION WHEN OTHERS THEN
      jwt_role := NULL;
    END;

    IF jwt_role = 'service_role' THEN
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END IF;

    IF current_user IN ('postgres', 'supabase_admin') AND auth.uid() IS NULL THEN
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END IF;

    -- Prevent deletion of the root admin account
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Akses ditolak: Akun root admin tidak dapat dihapus.';
    END IF;

    -- Get the current authenticated user's email
    SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();

    -- If role is being changed, only admin@xenoent.com themselves may execute it
    IF (NEW.role IS DISTINCT FROM OLD.role) AND (caller_email IS DISTINCT FROM 'admin@xenoent.com') THEN
      RAISE EXCEPTION 'Akses ditolak: Peran akun admin@xenoent.com dilindungi dan tidak dapat diubah oleh pengguna lain.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_root_admin ON public.profiles;
CREATE TRIGGER trg_protect_root_admin
  BEFORE UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_root_admin_account();
