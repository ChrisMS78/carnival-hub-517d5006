-- Add image_url column to about_content table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'about_content' AND column_name = 'image_url') THEN
    ALTER TABLE public.about_content ADD COLUMN image_url text;
  END IF;
END $$;

-- Create page_backgrounds table for storing background images for each page
CREATE TABLE IF NOT EXISTS public.page_backgrounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key text UNIQUE NOT NULL,
  page_label text NOT NULL,
  background_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_backgrounds ENABLE ROW LEVEL SECURITY;

-- Create policies for page_backgrounds
CREATE POLICY "Page backgrounds are viewable by everyone" 
ON public.page_backgrounds 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage page backgrounds" 
ON public.page_backgrounds 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Insert default page entries
INSERT INTO public.page_backgrounds (page_key, page_label) VALUES
  ('home', 'Startseite'),
  ('termine', 'Termine'),
  ('ueber-uns', 'Über Uns'),
  ('galerie', 'Galerie'),
  ('kontakt', 'Kontakt')
ON CONFLICT (page_key) DO NOTHING;