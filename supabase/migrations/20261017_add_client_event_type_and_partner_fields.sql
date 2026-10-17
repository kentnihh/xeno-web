-- Migration: Add event_type and partner fields for Wedding clients to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS partner_name TEXT,
  ADD COLUMN IF NOT EXISTS partner_email TEXT,
  ADD COLUMN IF NOT EXISTS partner_phone TEXT,
  ADD COLUMN IF NOT EXISTS partner_address TEXT;

-- Index on event_type for fast filtering
CREATE INDEX IF NOT EXISTS idx_clients_event_type ON clients (event_type);
