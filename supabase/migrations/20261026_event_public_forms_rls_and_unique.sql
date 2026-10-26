-- Migration: Ensure unique constraint on event_id for event_public_forms and update RLS policies
-- 1. Ensure slug and default columns can auto-populate
ALTER TABLE public.event_public_forms 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Formulir Data Keluarga';

ALTER TABLE public.event_public_forms 
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN is_active SET DEFAULT true;

-- 2. Ensure unique constraint on event_id exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_public_forms_event_id_unique'
  ) THEN
    ALTER TABLE public.event_public_forms ADD CONSTRAINT event_public_forms_event_id_unique UNIQUE (event_id);
  END IF;
END $$;

-- 3. Enable RLS and Policies
ALTER TABLE public.event_public_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated all event_public_forms" ON public.event_public_forms;
CREATE POLICY "Allow authenticated all event_public_forms"
  ON public.event_public_forms
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to view forms
DROP POLICY IF EXISTS "Allow authenticated read event_public_forms" ON public.event_public_forms;
CREATE POLICY "Allow authenticated read event_public_forms"
  ON public.event_public_forms FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create/insert forms
DROP POLICY IF EXISTS "Allow authenticated insert event_public_forms" ON public.event_public_forms;
CREATE POLICY "Allow authenticated insert event_public_forms"
  ON public.event_public_forms FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update forms
DROP POLICY IF EXISTS "Allow authenticated update event_public_forms" ON public.event_public_forms;
CREATE POLICY "Allow authenticated update event_public_forms"
  ON public.event_public_forms FOR UPDATE
  TO authenticated
  USING (true);
