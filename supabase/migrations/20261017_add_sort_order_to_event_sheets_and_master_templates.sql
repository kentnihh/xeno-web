-- ==============================================================================
-- Supabase Migration: Add sort_order to event_sheets and master_templates
-- ==============================================================================

-- 1. Add sort_order column to event_sheets
ALTER TABLE public.event_sheets
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 2. Add sort_order column to master_templates
ALTER TABLE public.master_templates
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 3. Backfill sort_order from existing order_index
UPDATE public.event_sheets
  SET sort_order = order_index
  WHERE (sort_order = 0 OR sort_order IS NULL) AND order_index IS NOT NULL;

UPDATE public.master_templates
  SET sort_order = order_index
  WHERE (sort_order = 0 OR sort_order IS NULL) AND order_index IS NOT NULL;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_event_sheets_sort_order ON public.event_sheets(sort_order);
CREATE INDEX IF NOT EXISTS idx_master_templates_sort_order ON public.master_templates(sort_order);
