-- Kolom Google Calendar untuk tugas kru (event_tasks)
alter table public.event_tasks
  add column if not exists gcal_event_id text,
  add column if not exists gcal_start timestamptz,
  add column if not exists gcal_end timestamptz;
