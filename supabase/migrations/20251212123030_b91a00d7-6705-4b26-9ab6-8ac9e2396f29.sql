-- Add sort_order column to events table for ordering
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;