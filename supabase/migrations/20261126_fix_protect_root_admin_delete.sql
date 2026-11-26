-- Fix: BEFORE DELETE trigger must return OLD (not NEW, which is NULL on DELETE)
-- Returning NULL from a BEFORE DELETE trigger silently cancels the row deletion without error.

CREATE OR REPLACE FUNCTION public.protect_root_admin_account()
RETURNS TRIGGER AS $$
DECLARE
  caller_email text;
  jwt_role text;
BEGIN
  IF OLD.email = 'admin@xenoent.com' THEN
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

    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Akses ditolak: Akun root admin tidak dapat dihapus.';
    END IF;

    SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();

    IF (NEW.role IS DISTINCT FROM OLD.role) AND (caller_email IS DISTINCT FROM 'admin@xenoent.com') THEN
      RAISE EXCEPTION 'Akses ditolak: Peran akun admin@xenoent.com dilindungi dan tidak dapat diubah oleh pengguna lain.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
