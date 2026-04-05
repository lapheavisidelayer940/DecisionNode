-- Add is_admin column to profiles for role-based access control
-- This replaces the hardcoded email check in AdminReportsPage

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Index for fast admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin 
ON public.profiles(is_admin) WHERE is_admin = true;

-- Grant your admin user admin privileges (run this manually in Supabase SQL editor)
-- UPDATE public.profiles SET is_admin = true WHERE id = 'YOUR_USER_ID';

-- Allow admins to view all content reports
CREATE POLICY "Admins can view all reports" ON content_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to update report status
CREATE POLICY "Admins can update reports" ON content_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to delete packs (for moderation)
CREATE POLICY "Admins can delete any pack" ON packs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

COMMENT ON COLUMN public.profiles.is_admin IS 'Admin flag for content moderation access';
