-- Add is_active column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add section_type to about_content for separating stories and downloads
ALTER TABLE public.about_content ADD COLUMN IF NOT EXISTS section_type text DEFAULT 'story' CHECK (section_type IN ('story', 'download'));

-- Update RLS policies for events - allow redakteur to manage
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "Admins and Redakteurs can manage events" ON public.events
FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'redakteur'));

-- Update RLS policies for gallery_albums - allow redakteur to manage
DROP POLICY IF EXISTS "Admins can manage albums" ON public.gallery_albums;
CREATE POLICY "Admins and Redakteurs can manage albums" ON public.gallery_albums
FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'redakteur'));

-- Update RLS policies for gallery_images - allow redakteur to manage
DROP POLICY IF EXISTS "Admins can manage images" ON public.gallery_images;
CREATE POLICY "Admins and Redakteurs can manage images" ON public.gallery_images
FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'redakteur'));

-- Create a function to check if user is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- Allow admins to manage user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user roles" ON public.user_roles
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Allow admins to manage profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL USING (has_role(auth.uid(), 'admin'));