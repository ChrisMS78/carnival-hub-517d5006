-- Create site_settings table for editable content
CREATE TABLE public.site_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL UNIQUE,
    value text,
    label text NOT NULL,
    category text NOT NULL DEFAULT 'general',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Site settings are viewable by everyone" 
ON public.site_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage site settings" 
ON public.site_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.site_settings (key, value, label, category) VALUES
-- Hero Section
('hero_title', 'Karneval bei Dir vor Ort', 'Hauptüberschrift (Hero)', 'hero'),
('hero_subtitle', 'Die fünfte Jahreszeit in Bösensell', 'Untertitel (Hero)', 'hero'),
-- About Page
('about_title', 'Über Uns', 'Seitentitel (Über uns)', 'about'),
('about_subtitle', 'Helau Bösensell - Lernen Sie uns kennen!', 'Untertitel (Über uns)', 'about'),
('about_stat_members', '150+', 'Statistik: Mitglieder', 'about'),
('about_stat_years', '10+', 'Statistik: Jahre Tradition', 'about'),
('about_stat_events', '20+', 'Statistik: Events pro Jahr', 'about'),
-- Contact Page
('contact_address', 'Musterstraße 123\n48329 Bösensell', 'Adresse', 'contact'),
('contact_email', 'info@keb-ev.de', 'E-Mail', 'contact'),
('contact_phone', '+49 123 456789', 'Telefon', 'contact'),
('contact_title', 'Kontakt', 'Seitentitel (Kontakt)', 'contact'),
('contact_subtitle', 'Wir freuen uns auf Ihre Nachricht!', 'Untertitel (Kontakt)', 'contact');