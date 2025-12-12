-- Add sort_order column to gallery_albums table for ordering
ALTER TABLE public.gallery_albums ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;