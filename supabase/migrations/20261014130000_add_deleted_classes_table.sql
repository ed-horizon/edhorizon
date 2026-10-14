-- Create deleted_classes table for tracking class session deletions with mandatory reasons
CREATE TABLE IF NOT EXISTS public.deleted_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_class_id UUID NOT NULL,
  title TEXT NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  teacher_name TEXT,
  student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  student_name TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status_before_deletion TEXT NOT NULL,
  deletion_reason TEXT NOT NULL,
  deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_by_name TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS deleted_classes_scheduled_idx ON public.deleted_classes(scheduled_at);
CREATE INDEX IF NOT EXISTS deleted_classes_deleted_at_idx ON public.deleted_classes(deleted_at);
CREATE INDEX IF NOT EXISTS deleted_classes_teacher_idx ON public.deleted_classes(teacher_id);
CREATE INDEX IF NOT EXISTS deleted_classes_student_idx ON public.deleted_classes(student_id);

-- Row Level Security (RLS)
ALTER TABLE public.deleted_classes ENABLE ROW LEVEL SECURITY;

-- 1. SELECT policy: Strictly restricted to Admin, Super Admin, HR, Operations
DROP POLICY IF EXISTS "Staff can view deleted classes" ON public.deleted_classes;
CREATE POLICY "Staff can view deleted classes"
  ON public.deleted_classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role::text IN ('super_admin', 'admin', 'hr', 'operations')
    )
  );

-- 2. INSERT policy: Strictly restricted to Admin, Super Admin, HR, Operations
DROP POLICY IF EXISTS "Staff can insert deleted classes" ON public.deleted_classes;
CREATE POLICY "Staff can insert deleted classes"
  ON public.deleted_classes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role::text IN ('super_admin', 'admin', 'hr', 'operations')
    )
  );

-- Revoke all permissions from anon
REVOKE ALL ON TABLE public.deleted_classes FROM anon;
GRANT SELECT, INSERT ON TABLE public.deleted_classes TO authenticated;
GRANT ALL ON TABLE public.deleted_classes TO service_role;
