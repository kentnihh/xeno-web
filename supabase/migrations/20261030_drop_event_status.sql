-- Drop indexes or check constraints referencing status if any exist
DROP INDEX IF EXISTS public.idx_events_status;

-- Drop status column from events table
ALTER TABLE public.events DROP COLUMN IF EXISTS status;

-- Drop custom enum type used exclusively for event status
DROP TYPE IF EXISTS public.event_status;
