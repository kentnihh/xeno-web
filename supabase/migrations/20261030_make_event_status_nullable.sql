-- Make status column in events table nullable
-- Event status is no longer displayed or required in UI workflows, but column is preserved for backward compatibility
alter table public.events alter column status drop not null;
