-- ==============================================================================
-- DATABASE SCHEMA SYNCHRONIZATION MIGRATION
-- Migration: 20261015_sync_schema_updates.sql
-- Single Source of Truth Synchronization between Live Supabase DB and Repository
-- ==============================================================================

-- 1. SYNCHRONIZE public.events TABLE
-- Drop legacy budget check constraint
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS check_event_budget_positive;

-- Drop legacy budget and finance columns from events table
ALTER TABLE public.events DROP COLUMN IF EXISTS budget;
ALTER TABLE public.events DROP COLUMN IF EXISTS estimated_budget;
ALTER TABLE public.events DROP COLUMN IF EXISTS actual_cost;

-- Add Person In Charge (pic) text column
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS pic text;

-- Ensure client_id column exists referencing public.clients(id) with ON DELETE SET NULL
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Index client_id for foreign key lookup performance
CREATE INDEX IF NOT EXISTS idx_events_client_id ON public.events(client_id);


-- 2. REPAIR is_admin() FUNCTION
-- Ensure is_admin() checks both public.profiles and public.user_roles with SECURITY DEFINER
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


-- 3. REPAIR handle_new_user() TRIGGER FUNCTION
-- Ensure handle_new_user() runs with SECURITY DEFINER and handles conflicts gracefully
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


-- 4. SYNCHRONIZE public.profiles ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users or admin can insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Users or admin can insert profile" ON public.profiles;
CREATE POLICY "Users or admin can insert profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- UPDATE policy
DROP POLICY IF EXISTS "Users or admin can update profile" ON public.profiles;
CREATE POLICY "Users or admin can update profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- DELETE policy
DROP POLICY IF EXISTS "Admin can delete profile" ON public.profiles;
CREATE POLICY "Admin can delete profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- 5. SYNCHRONIZE RBAC ADMIN POLICIES (roles, permissions, role_permissions, user_roles)
DROP POLICY IF EXISTS "Roles all admin" ON public.roles;
CREATE POLICY "Roles all admin"
  ON public.roles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Permissions all admin" ON public.permissions;
CREATE POLICY "Permissions all admin"
  ON public.permissions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Role perms all admin" ON public.role_permissions;
CREATE POLICY "Role perms all admin"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "User roles all admin" ON public.user_roles;
CREATE POLICY "User roles all admin"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- 6. SYNCHRONIZE STORAGE BUCKET CONFIGURATION
UPDATE storage.buckets
SET file_size_limit = 52428800 -- 50MB
WHERE id = 'bucket-files';


-- 7. SYNCHRONIZE CLIENTS DELETE POLICY (Admins & Managers with clients:manage)
DROP POLICY IF EXISTS "Admin can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Admin or manager can delete clients" ON public.clients;
CREATE POLICY "Admin or manager can delete clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      JOIN public.role_permissions rp ON ur.role_id = rp.role_id 
      WHERE ur.user_id = auth.uid() AND rp.permission_id IN ('clients:manage', 'clients.delete')
    )
  );

