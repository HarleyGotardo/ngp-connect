-- supabase/migrations/003_add_court_coordinates.sql
-- Add latitude and longitude to courts table for map rendering

ALTER TABLE public.courts 
ADD COLUMN IF NOT EXISTS latitude numeric(9,6) DEFAULT 10.3157,
ADD COLUMN IF NOT EXISTS longitude numeric(9,6) DEFAULT 123.8854;
