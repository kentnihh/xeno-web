-- ==============================================================================
-- 20261021_cascade_delete_events.sql
-- Ensure all child tables referencing events(id) have ON DELETE CASCADE constraints
-- ==============================================================================

-- 1. event_crew (assigned crew)
ALTER TABLE IF EXISTS public.event_crew DROP CONSTRAINT IF EXISTS event_crew_event_id_fkey;
ALTER TABLE IF EXISTS public.event_crew
  ADD CONSTRAINT event_crew_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- 2. event_tasks (crew tasks)
ALTER TABLE IF EXISTS public.event_tasks DROP CONSTRAINT IF EXISTS event_tasks_event_id_fkey;
ALTER TABLE IF EXISTS public.event_tasks
  ADD CONSTRAINT event_tasks_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- tasks (fallback compatibility if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_event_id_fkey;
    ALTER TABLE public.tasks ADD CONSTRAINT tasks_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. event_documents (uploaded event documents)
ALTER TABLE IF EXISTS public.event_documents DROP CONSTRAINT IF EXISTS event_documents_event_id_fkey;
ALTER TABLE IF EXISTS public.event_documents
  ADD CONSTRAINT event_documents_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- documents (fallback compatibility if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
    ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_event_id_fkey;
    ALTER TABLE public.documents ADD CONSTRAINT documents_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. event_sheets (FortuneSheet spreadsheets)
ALTER TABLE IF EXISTS public.event_sheets DROP CONSTRAINT IF EXISTS event_sheets_event_id_fkey;
ALTER TABLE IF EXISTS public.event_sheets
  ADD CONSTRAINT event_sheets_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- 5. event_public_forms (dynamic family data forms & tokens)
ALTER TABLE IF EXISTS public.event_public_forms DROP CONSTRAINT IF EXISTS event_public_forms_event_id_fkey;
ALTER TABLE IF EXISTS public.event_public_forms
  ADD CONSTRAINT event_public_forms_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- 6. event_vendors (mitra vendors)
ALTER TABLE IF EXISTS public.event_vendors DROP CONSTRAINT IF EXISTS event_vendors_event_id_fkey;
ALTER TABLE IF EXISTS public.event_vendors
  ADD CONSTRAINT event_vendors_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- 7. event_expenses (event operational finances)
ALTER TABLE IF EXISTS public.event_expenses DROP CONSTRAINT IF EXISTS event_expenses_event_id_fkey;
ALTER TABLE IF EXISTS public.event_expenses
  ADD CONSTRAINT event_expenses_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
