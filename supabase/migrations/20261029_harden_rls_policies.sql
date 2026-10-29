-- ==============================================================================
-- Migration: 20261029_harden_rls_policies.sql
-- 1. Remove dangerous over-permissive anon policies on event_public_forms
--    (Form access is strictly handled server-side via Server Actions with service role)
-- 2. Restrict DELETE permissions on event_expenses, event_documents, and event_sheets
-- ==============================================================================

-- 1. Remove anon access policies that allowed arbitrary dumping of public forms
DROP POLICY IF EXISTS "Public can view event_public_forms with valid token" ON public.event_public_forms;
DROP POLICY IF EXISTS "Public can update form_data with valid unexpired token" ON public.event_public_forms;

-- 2. Restrict deletion of event expenses to admin or manager
DROP POLICY IF EXISTS "Staff can delete expenses" ON public.event_expenses;
DROP POLICY IF EXISTS "Admin or manager can delete expenses" ON public.event_expenses;
CREATE POLICY "Admin or manager can delete expenses" 
  ON public.event_expenses FOR DELETE TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role_id IN ('admin', 'manager')
    )
  );

-- 3. Restrict deletion of event documents to admin, manager, or document uploader
DROP POLICY IF EXISTS "Authenticated users can delete event documents" ON public.event_documents;
DROP POLICY IF EXISTS "Admin or manager or uploader can delete event documents" ON public.event_documents;
CREATE POLICY "Admin or manager or uploader can delete event documents" 
  ON public.event_documents FOR DELETE TO authenticated
  USING (
    public.is_admin() OR uploaded_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role_id IN ('admin', 'manager')
    )
  );

-- 4. Restrict deletion of event sheets to admin or manager
DROP POLICY IF EXISTS "Authenticated users can delete event sheets" ON public.event_sheets;
DROP POLICY IF EXISTS "Admin or manager can delete event sheets" ON public.event_sheets;
CREATE POLICY "Admin or manager can delete event sheets" 
  ON public.event_sheets FOR DELETE TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role_id IN ('admin', 'manager')
    )
  );
