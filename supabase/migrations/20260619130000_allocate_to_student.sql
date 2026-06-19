-- Truncate existing modules to start clean and avoid null reference issues on existing records
TRUNCATE TABLE public.modules CASCADE;

-- Alter modules table to add student_id
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Alter capsules table to add student_id
ALTER TABLE public.capsules ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- RLS policies adjustments
DROP POLICY IF EXISTS "Authenticated users can read modules" ON public.modules;
CREATE POLICY "Authenticated users can read modules" ON public.modules
FOR SELECT
USING (
  auth.role() = 'authenticated' AND (
    student_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('teacher', 'admin', 'super_admin', 'hr', 'sales')
    )
  )
);

DROP POLICY IF EXISTS "Tutors and admins can manage modules" ON public.modules;
CREATE POLICY "Tutors and admins can manage modules" ON public.modules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('teacher', 'admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('teacher', 'admin', 'super_admin')
  )
);

-- Courses and Topics RLS
DROP POLICY IF EXISTS "Tutors and admins can manage courses" ON public.courses;
CREATE POLICY "Tutors and admins can manage courses" ON public.courses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('teacher', 'admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('teacher', 'admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Tutors and admins can manage topics" ON public.topics;
CREATE POLICY "Tutors and admins can manage topics" ON public.topics
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('teacher', 'admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('teacher', 'admin', 'super_admin')
  )
);

-- Capsule select policy adjustment
DROP POLICY IF EXISTS "Authenticated users can read published capsules" ON public.capsules;
CREATE POLICY "Students can read assigned published capsules" ON public.capsules
FOR SELECT
USING (
  auth.role() = 'authenticated' AND status = 'published' AND (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('teacher', 'admin', 'super_admin', 'hr', 'sales')
    )
  )
);

-- Author delete policy
DROP POLICY IF EXISTS "Authors can delete own capsules" ON public.capsules;
CREATE POLICY "Authors can delete own capsules" ON public.capsules
FOR DELETE
USING (auth.uid() = author_id);
