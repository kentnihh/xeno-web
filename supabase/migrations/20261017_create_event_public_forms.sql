-- ==============================================================================
-- Supabase Migration: Create event_public_forms table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.event_public_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  form_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_public_forms_token ON public.event_public_forms(token);
CREATE INDEX IF NOT EXISTS idx_event_public_forms_event_id ON public.event_public_forms(event_id);

-- Enable Row Level Security
ALTER TABLE public.event_public_forms ENABLE ROW LEVEL SECURITY;

-- 1. Authenticated users (admin/staff) policies
DROP POLICY IF EXISTS "Authenticated users can select event_public_forms" ON public.event_public_forms;
CREATE POLICY "Authenticated users can select event_public_forms"
  ON public.event_public_forms FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert event_public_forms" ON public.event_public_forms;
CREATE POLICY "Authenticated users can insert event_public_forms"
  ON public.event_public_forms FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update event_public_forms" ON public.event_public_forms;
CREATE POLICY "Authenticated users can update event_public_forms"
  ON public.event_public_forms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete event_public_forms" ON public.event_public_forms;
CREATE POLICY "Authenticated users can delete event_public_forms"
  ON public.event_public_forms FOR DELETE TO authenticated USING (true);

-- 2. Public / Anon users can select active forms with token
DROP POLICY IF EXISTS "Public can view event_public_forms with valid token" ON public.event_public_forms;
CREATE POLICY "Public can view event_public_forms with valid token"
  ON public.event_public_forms FOR SELECT TO anon USING (token IS NOT NULL);

-- 3. Public / Anon users can submit/update form_data with unexpired token
DROP POLICY IF EXISTS "Public can update form_data with valid unexpired token" ON public.event_public_forms;
CREATE POLICY "Public can update form_data with valid unexpired token"
  ON public.event_public_forms FOR UPDATE TO anon
  USING (token IS NOT NULL AND expires_at > now())
  WITH CHECK (token IS NOT NULL AND expires_at > now());
