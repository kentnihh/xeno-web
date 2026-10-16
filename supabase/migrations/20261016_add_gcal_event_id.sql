-- Migration: Add gcal_event_id to events table for Google Calendar synchronization
ALTER TABLE events ADD COLUMN IF NOT EXISTS gcal_event_id TEXT;

-- Index for fast lookup by Google Calendar event ID
CREATE INDEX IF NOT EXISTS idx_events_gcal_event_id ON events (gcal_event_id);
