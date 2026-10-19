-- Migration: Add avatar_color to profiles table for role-based avatar icon personalization
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_color TEXT;

-- Comment for schema documentation
COMMENT ON COLUMN public.profiles.avatar_color IS 'Hex color string for ADMIN role avatar icon personalization (e.g. #007AFF)';
