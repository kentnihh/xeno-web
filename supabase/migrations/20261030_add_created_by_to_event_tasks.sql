-- Add created_by column to event_tasks to track task creator
ALTER TABLE public.event_tasks 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for faster filtering and joins on created_by
CREATE INDEX IF NOT EXISTS idx_event_tasks_created_by ON public.event_tasks(created_by);
