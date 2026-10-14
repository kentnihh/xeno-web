-- ==============================================================================
-- Supabase Migration: event_sheets and master_templates
-- ==============================================================================

-- 1. Create event_sheets table
CREATE TABLE IF NOT EXISTS public.event_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sheet_name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{"columns": [], "rows": []}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(event_id, sheet_name)
);

CREATE INDEX IF NOT EXISTS idx_event_sheets_event_id ON public.event_sheets(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sheets_order_index ON public.event_sheets(order_index);

ALTER TABLE public.event_sheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Event sheets viewable by authenticated users" ON public.event_sheets;
CREATE POLICY "Event sheets viewable by authenticated users"
  ON public.event_sheets FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert event sheets" ON public.event_sheets;
CREATE POLICY "Authenticated users can insert event sheets"
  ON public.event_sheets FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update event sheets" ON public.event_sheets;
CREATE POLICY "Authenticated users can update event sheets"
  ON public.event_sheets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete event sheets" ON public.event_sheets;
CREATE POLICY "Authenticated users can delete event sheets"
  ON public.event_sheets FOR DELETE
  TO authenticated
  USING (true);

-- 2. Create master_templates table
CREATE TABLE IF NOT EXISTS public.master_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_name text NOT NULL UNIQUE,
  order_index integer NOT NULL DEFAULT 0,
  jsonb_structure jsonb NOT NULL DEFAULT '{"columns": [], "rows": []}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_master_templates_order ON public.master_templates(order_index);

ALTER TABLE public.master_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Master templates viewable by authenticated users" ON public.master_templates;
CREATE POLICY "Master templates viewable by authenticated users"
  ON public.master_templates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Master templates insertable by authenticated users" ON public.master_templates;
CREATE POLICY "Master templates insertable by authenticated users"
  ON public.master_templates FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Master templates updatable by authenticated users" ON public.master_templates;
CREATE POLICY "Master templates updatable by authenticated users"
  ON public.master_templates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Master templates deletable by authenticated users" ON public.master_templates;
CREATE POLICY "Master templates deletable by authenticated users"
  ON public.master_templates FOR DELETE
  TO authenticated
  USING (true);
