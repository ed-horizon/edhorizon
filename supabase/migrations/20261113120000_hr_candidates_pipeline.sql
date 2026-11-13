-- Create hr_candidates table for HR recruitment pipeline
CREATE TABLE IF NOT EXISTS public.hr_candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  subject TEXT NOT NULL,
  salary_discussed TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'screening', 'interview_scheduled', 'selected', 'rejected', 'onboarded')
  ),
  feedback TEXT DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS hr_candidates_status_idx ON public.hr_candidates(status);
CREATE INDEX IF NOT EXISTS hr_candidates_created_at_idx ON public.hr_candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS hr_candidates_subject_idx ON public.hr_candidates(subject);

-- Enable Row Level Security (RLS)
ALTER TABLE public.hr_candidates ENABLE ROW LEVEL SECURITY;

-- 1. SELECT policy: Restricted to HR, Admin, Super Admin
DROP POLICY IF EXISTS "HR and Admin can view candidates" ON public.hr_candidates;
CREATE POLICY "HR and Admin can view candidates"
  ON public.hr_candidates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role::text IN ('hr', 'admin', 'super_admin')
    )
  );

-- 2. INSERT policy: Restricted to HR, Admin, Super Admin
DROP POLICY IF EXISTS "HR and Admin can insert candidates" ON public.hr_candidates;
CREATE POLICY "HR and Admin can insert candidates"
  ON public.hr_candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role::text IN ('hr', 'admin', 'super_admin')
    )
  );

-- 3. UPDATE policy: Restricted to HR, Admin, Super Admin
DROP POLICY IF EXISTS "HR and Admin can update candidates" ON public.hr_candidates;
CREATE POLICY "HR and Admin can update candidates"
  ON public.hr_candidates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role::text IN ('hr', 'admin', 'super_admin')
    )
  );

-- 4. DELETE policy: Restricted to HR, Admin, Super Admin
DROP POLICY IF EXISTS "HR and Admin can delete candidates" ON public.hr_candidates;
CREATE POLICY "HR and Admin can delete candidates"
  ON public.hr_candidates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role::text IN ('hr', 'admin', 'super_admin')
    )
  );

