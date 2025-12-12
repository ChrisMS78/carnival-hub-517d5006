-- Add delete policy for admins on contact_submissions
CREATE POLICY "Admins can delete submissions" 
ON public.contact_submissions 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));