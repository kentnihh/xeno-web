-- ==============================================================================
-- Migration: Fix profiles Row Level Security (RLS) & handle_new_user trigger
-- ==============================================================================

-- 1. Ensure is_admin() helper runs with SECURITY DEFINER and search_path = public
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role_id = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

-- 2. Ensure handle_new_user() trigger function runs with SECURITY DEFINER and search_path = public
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'staff'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    email = COALESCE(EXCLUDED.email, public.profiles.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. SELECT policies
-- Allow users to read their own profile (satisfies RETURNING * on inserts/updates)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to view all profiles (staff directory, crew selection, team management)
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 5. INSERT policy
-- Allow users to insert their own profile, or admins to insert profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users or admin can insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Users or admin can insert profile" ON public.profiles;
CREATE POLICY "Users or admin can insert profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 6. UPDATE policy
-- Allow users to update their own profile, or admins to update any profile
DROP POLICY IF EXISTS "Users or admin can update profile" ON public.profiles;
CREATE POLICY "Users or admin can update profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 7. DELETE policy
-- Only admins can delete profiles
DROP POLICY IF EXISTS "Admin can delete profile" ON public.profiles;
CREATE POLICY "Admin can delete profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());
