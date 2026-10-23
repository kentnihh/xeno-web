-- Supabase Migration: Add pax column to events table
-- Description: Stores the number of attendees/guests (Pax / Jumlah Undangan) for an event.

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS pax INTEGER DEFAULT NULL;
